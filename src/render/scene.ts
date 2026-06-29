/**
 * SceneView: owns the Three.js renderer, the fixed PERSPECTIVE camera, and the
 * lights. It is the only place the camera/renderer are configured. Other render
 * modules add their meshes to `scene` and SceneView draws them.
 *
 * Nothing here reads gameplay state — it's pure presentation setup.
 */

import * as THREE from 'three';

/**
 * Vertical field of view, in degrees. THIS is the main "zoom" feel for a
 * perspective camera: smaller fov = more zoomed-in / flatter (less dramatic
 * perspective), larger fov = wider / stronger foreshortening. 45 is a calm,
 * natural-looking choice for a tabletop scene.
 */
const FOV_DEGREES = 45;

/**
 * Framing reference. The camera position and shadow box below were hand-tuned
 * for a board whose largest dimension was this many cells. We scale them by the
 * actual board's span / this value so a bigger or smaller kitchen stays framed
 * the same way — resizing the layout doesn't require re-tuning the camera.
 */
const REFERENCE_SPAN = 7;

/** Camera offset for a REFERENCE_SPAN board; scaled to the real board's span. */
const REFERENCE_CAMERA = { y: 10, z: 8.5 };

/** Extra world units of shadow coverage beyond the board's half-extent, so
 * shadows cast outward by the angled sun aren't clipped at the board edge. */
const SHADOW_MARGIN = 2.5;

export class SceneView {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement, cols: number, rows: number) {
    // The board's largest dimension drives both framing and shadow coverage.
    const span = Math.max(cols, rows);
    const frameScale = span / REFERENCE_SPAN;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x20222b);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // Enable shadows. PCFSoft gives softer, less jagged shadow edges than the
    // default hard shadow map — the nicest-looking option without extra cost.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // --- Perspective camera ----------------------------------------------
    // Unlike orthographic, a perspective camera DOES foreshorten: the far side
    // of the kitchen renders smaller than the near side, and distance now
    // affects how big things look. We frame the 7x6 board by placing the camera
    // high and back on +z, looking at the origin.
    //
    // The fov is the VERTICAL angle; horizontal is derived from the aspect
    // ratio (set in resize()). On a very narrow window the sides could clip —
    // acceptable for now; we'd dolly the camera back to fix it later.
    this.camera = new THREE.PerspectiveCamera(
      FOV_DEGREES,
      1, // aspect — real value set in resize()
      0.1, // near
      100, // far
    );

    // Angled bird's-eye / tabletop view. Above and to the +z (south) side,
    // looking at the origin, so NORTH is at the top of the screen and EAST is
    // to the right. The elevation angle (~atan(10/8.5) ~ 50 degrees) is fixed;
    // we just dolly the camera in/out by frameScale so a larger board fits.
    // Move REFERENCE_CAMERA.y higher for more top-down, lower for more drama.
    this.camera.position.set(
      0,
      REFERENCE_CAMERA.y * frameScale,
      REFERENCE_CAMERA.z * frameScale,
    );
    this.camera.lookAt(0, 0, 0);

    // --- Lights -----------------------------------------------------------
    // Ambient fills shadows so nothing is pure black; directional is the "sun"
    // that actually casts the shadows.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(6, 14, 6);
    sun.castShadow = true;

    // A directional light's shadow is rendered through its OWN orthographic
    // camera. We size that camera's box to just cover the kitchen (its
    // half-extent plus a margin for shadows cast past the edge) so the limited
    // shadow-map resolution is spent on the area we care about — too big a box =
    // blocky shadows, too small = shadows clipped at the edges. Derived from the
    // board span so it tracks the kitchen size.
    const shadowExtent = span / 2 + SHADOW_MARGIN;
    sun.shadow.camera.left = -shadowExtent;
    sun.shadow.camera.right = shadowExtent;
    sun.shadow.camera.top = shadowExtent;
    sun.shadow.camera.bottom = -shadowExtent;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    // Resolution of the shadow map. Higher = crisper shadows, more GPU cost.
    sun.shadow.mapSize.set(2048, 2048);
    // Nudges the shadow off the surface to avoid "shadow acne" (self-shadowing
    // speckles). If you see stripes on the floor, tweak this slightly.
    sun.shadow.bias = -0.0005;

    this.scene.add(sun);

    // Size everything to the current window and keep it correct on resize.
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  /**
   * Keep the renderer and the camera correct for the window size. For a
   * perspective camera this is simpler than ortho: just set the aspect ratio
   * (width / height) and update the projection matrix.
   */
  private readonly resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.camera.aspect = w / h;
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
