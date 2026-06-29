/**
 * PlayerView: draws the player and, each frame, makes its mesh match the model.
 * It READS player.pos / player.facing and writes mesh transform — never the
 * other way around. This is the only per-frame "sync the view to the model".
 *
 * The player is a capsule body with a cone "nose" showing which way it faces.
 * (Three r185 has CapsuleGeometry; the old r128 the spec mentioned did not, in
 * which case you'd compose a cylinder + sphere instead.)
 */

import * as THREE from 'three';
import type { Player } from '../world/player';
import type { Facing } from '../world/types';
import { gridToWorld } from '../world/coords';

const BODY_RADIUS = 0.3;
const BODY_LENGTH = 0.5; // cylindrical middle, excluding the rounded caps
/** Center height so the capsule's base rests on the floor (y=0). */
const BODY_CENTER_Y = BODY_LENGTH / 2 + BODY_RADIUS;

/**
 * Yaw (rotation about +Y) for each facing, so the nose — modeled pointing along
 * local +z — ends up pointing the right way in world space. Derived from how a
 * +Y rotation maps +z: south(+z)=0, east(+x)=+90, north(-z)=180, west(-x)=-90.
 */
const FACING_YAW: Record<Facing, number> = {
  south: 0,
  east: Math.PI / 2,
  north: Math.PI,
  west: -Math.PI / 2,
};

export class PlayerView {
  private readonly root: THREE.Group;
  private readonly cols: number;
  private readonly rows: number;

  constructor(scene: THREE.Scene, cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.root = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(BODY_RADIUS, BODY_LENGTH, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x4aa3ff }),
    );
    body.position.y = BODY_CENTER_Y;
    this.root.add(body);

    // Nose: a small cone. Cones are modeled pointing +Y, so rotate +90 deg
    // about X to point it along local +z ("forward"), then push it out front.
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd24a }),
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, BODY_CENTER_Y, BODY_RADIUS + 0.1);
    this.root.add(nose);

    scene.add(this.root);
  }

  /**
   * Sync mesh to model. Called every render. Movement is grid-snapped, so the
   * mesh teleports cell-to-cell (no tweening yet — that's a future nicety, and
   * the place the fixed-timestep interpolation alpha would feed in).
   */
  sync(player: Player): void {
    const { x, z } = gridToWorld(
      player.pos.col,
      player.pos.row,
      this.cols,
      this.rows,
    );
    this.root.position.set(x, 0, z);
    this.root.rotation.y = FACING_YAW[player.facing];
  }
}
