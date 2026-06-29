/**
 * SceneView: owns the Three.js renderer, the fixed orthographic camera, and the
 * lights. It is the only place the camera/renderer are configured. Other render
 * modules add their meshes to `scene` and SceneView draws them.
 *
 * Nothing here reads gameplay state — it's pure presentation setup.
 */

import * as THREE from 'three';

/**
 * Half the world-height the camera shows, in world units. THIS is your zoom
 * knob for an orthographic camera. Our kitchen is 6 cells tall, so a half-height
 * of ~4.5 (=> 9 units visible vertically) frames it with a little margin.
 * Increase to zoom OUT, decrease to zoom IN.
 */
const FRUSTUM_HALF_HEIGHT = 4.5;

export class SceneView {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x20222b);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // --- Orthographic camera ---------------------------------------------
    // An orthographic camera has NO perspective: parallel lines stay parallel
    // and, crucially, moving the camera closer/farther does NOT change how big
    // things look (that's set by the frustum planes below). So we get the size
    // from FRUSTUM_HALF_HEIGHT and the *angle* from the camera position.
    //
    // We derive left/right from the aspect ratio so cells stay square on any
    // window shape: vertical extent is fixed, horizontal scales with aspect.
    this.camera = new THREE.OrthographicCamera(
      -FRUSTUM_HALF_HEIGHT, // left   (overwritten in resize())
      FRUSTUM_HALF_HEIGHT, // right
      FRUSTUM_HALF_HEIGHT, // top
      -FRUSTUM_HALF_HEIGHT, // bottom
      0.1, // near
      100, // far
    );

    // Angled bird's-eye / tabletop view. The camera sits above and to the
    // +z (south) side and looks at the origin, so:
    //   - it looks toward -z, putting NORTH at the top of the screen,
    //   - its right is +x, putting EAST to the right.
    // Position is high+back for a tilt of ~atan(10/8) ~ 51 degrees above the
    // floor. Distance doesn't affect zoom (ortho) — only this tilt does.
    this.camera.position.set(0, 10, 8);
    this.camera.lookAt(0, 0, 0);

    // --- Lights -----------------------------------------------------------
    // Ambient fills shadows so nothing is pure black; directional gives the
    // boxes a lit side for readable depth.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(5, 12, 6);
    // SHADOWS LATER: enable renderer.shadowMap, set sun.castShadow + a shadow
    // camera frustum, and mark meshes cast/receiveShadow. Skipped this session.
    this.scene.add(sun);

    // Size everything to the current window and keep it correct on resize.
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  /**
   * Keep the renderer and the ORTHO frustum correct for the window size.
   * For an orthographic camera, resizing means recomputing left/right (top and
   * bottom stay fixed at the half-height) so the aspect ratio doesn't squash
   * the scene, then calling updateProjectionMatrix().
   */
  private readonly resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;

    this.camera.left = -FRUSTUM_HALF_HEIGHT * aspect;
    this.camera.right = FRUSTUM_HALF_HEIGHT * aspect;
    this.camera.top = FRUSTUM_HALF_HEIGHT;
    this.camera.bottom = -FRUSTUM_HALF_HEIGHT;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
  };

  /** Draw the current scene from the fixed camera. Called by the game loop. */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
  }
}
