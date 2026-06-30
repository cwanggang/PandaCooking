/**
 * A small reusable progress bar: a white track with a green fill that grows
 * left-to-right as progress goes 0 -> 1. Meant to float above a station while a
 * timed process runs (chopping now; cooking, etc. later). PRESENTATION ONLY.
 *
 * The camera is fixed (looking at the kitchen from above and to the south), so
 * the bar is a simple upright quad facing +z rather than a true billboard.
 * Materials are unlit and draw on top (depthTest off) so the bar reads clearly
 * over the food and props beneath it.
 */

import * as THREE from 'three';

const BAR_WIDTH = 0.6;
const BAR_HEIGHT = 0.1;
/** Tiny gap so the green fill renders just in front of the white track. */
const FILL_Z = 0.001;

export class ProgressBar {
  /** Add this to the scene; position it with setPosition(). */
  readonly root: THREE.Group;
  private readonly fill: THREE.Mesh;

  constructor() {
    this.root = new THREE.Group();
    this.root.visible = false;

    this.root.add(makeQuad(BAR_WIDTH, BAR_HEIGHT, 0xffffff, 0));

    // The fill's geometry is shifted so its LEFT edge is at the group origin,
    // then the whole fill is moved to the track's left edge. Scaling fill.x
    // about that origin then grows it rightward from the left.
    this.fill = makeQuad(BAR_WIDTH, BAR_HEIGHT, 0x35c451, FILL_Z);
    this.fill.geometry.translate(BAR_WIDTH / 2, 0, 0);
    this.fill.position.x = -BAR_WIDTH / 2;
    this.root.add(this.fill);
  }

  /** Set fill amount, clamped to [0, 1]. */
  setProgress(t: number): void {
    this.fill.scale.x = Math.min(1, Math.max(0, t));
  }

  setPosition(x: number, y: number, z: number): void {
    this.root.position.set(x, y, z);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }
}

/** A flat, unlit, always-on-top quad in the XY plane (facing +z). */
function makeQuad(
  width: number,
  height: number,
  color: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color, depthTest: false }),
  );
  mesh.position.z = z;
  mesh.renderOrder = 999; // draw after the scene so it's never occluded
  return mesh;
}
