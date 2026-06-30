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
import type { ItemModels } from './models';
import { buildItemMesh, itemSignature } from './itemMesh';
import { gridToWorld } from '../world/coords';

/**
 * Where a held item sits in the panda's LOCAL space: out in front (+z, the
 * facing direction) at roughly hand height. Because the held item is a child of
 * the panda group, it inherits position + facing automatically.
 */
const HELD_ITEM_OFFSET = { x: 0, y: 0.6, z: 0.3 };

/**
 * Yaw (rotation about +Y) for each facing.
 */
const FACING_YAW: Record<Facing, number> = {
  south: 0,
  east: Math.PI / 2,
  north: Math.PI,
  west: -Math.PI / 2,
};

const MOVE_LERP_DURATION = 180; // ms for smooth movement

export class PlayerView {
  private readonly root: THREE.Group;
  private readonly cols: number;
  private readonly rows: number;
  private readonly itemModels: ItemModels;

  private heldMesh: THREE.Object3D | null = null;
  private heldSignature = '';

  private prevCol = 0;
  private prevRow = 0;
  private currentCol = 0;
  private currentRow = 0;
  private moveStartTime = 0;

  constructor(
    scene: THREE.Scene,
    cols: number,
    rows: number,
    itemModels: ItemModels,
    model: THREE.Object3D,
  ) {
    this.cols = cols;
    this.rows = rows;
    this.itemModels = itemModels;
    this.root = new THREE.Group();

    const panda = model.clone();
    panda.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    const box = new THREE.Box3().setFromObject(panda);
    if (box.min.y < 0) panda.position.y = -box.min.y;
    this.root.add(panda);

    scene.add(this.root);
  }

  initPos(col: number, row: number): void {
    this.prevCol = col;
    this.prevRow = row;
    this.currentCol = col;
    this.currentRow = row;
    this.moveStartTime = performance.now();
    const { x, z } = gridToWorld(col, row, this.cols, this.rows);
    this.root.position.set(x, 0, z);
  }

  sync(player: Player): void {
    const now = performance.now();

    if (player.pos.col !== this.currentCol || player.pos.row !== this.currentRow) {
      this.prevCol = this.currentCol;
      this.prevRow = this.currentRow;
      this.currentCol = player.pos.col;
      this.currentRow = player.pos.row;
      this.moveStartTime = now;
    }

    const elapsed = now - this.moveStartTime;
    const t = Math.min(elapsed / MOVE_LERP_DURATION, 1);
    const lerpCol = this.prevCol + (this.currentCol - this.prevCol) * t;
    const lerpRow = this.prevRow + (this.currentRow - this.prevRow) * t;

    const { x, z } = gridToWorld(lerpCol, lerpRow, this.cols, this.rows);
    this.root.position.set(x, 0, z);
    this.root.rotation.y = FACING_YAW[player.facing];

    const signature = itemSignature(player.heldItem);
    if (signature === this.heldSignature) return;
    this.heldSignature = signature;

    if (this.heldMesh) {
      this.root.remove(this.heldMesh);
      this.heldMesh = null;
    }
    if (player.heldItem !== null) {
      const mesh = buildItemMesh(player.heldItem, this.itemModels);
      mesh.position.set(
        HELD_ITEM_OFFSET.x,
        HELD_ITEM_OFFSET.y,
        HELD_ITEM_OFFSET.z,
      );
      this.root.add(mesh);
      this.heldMesh = mesh;
    }
  }
}
