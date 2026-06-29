/**
 * KitchenView: turns the world's Grid into meshes — one box per counter cell,
 * plus a floor plane. The kitchen is static, so we build the meshes ONCE in the
 * constructor and never touch them again. This module reads the model and draws;
 * it makes no gameplay decisions.
 *
 * Every position goes through gridToWorld() so meshes land exactly on cells.
 */

import * as THREE from 'three';
import type { Grid } from '../world/grid';
import { CELL_SIZE, gridToWorld } from '../world/coords';

/** How tall a counter box stands above the floor (world units). */
const COUNTER_HEIGHT = 0.8;

export class KitchenView {
  /** A group holding all kitchen meshes, added to the scene as one unit. */
  readonly root: THREE.Group;

  constructor(grid: Grid, scene: THREE.Scene) {
    this.root = new THREE.Group();

    // --- Floor: one plane spanning the whole footprint -------------------
    // A PlaneGeometry is created in the XY plane facing +z, so we rotate it
    // -90 deg about X to lay it flat on the XZ plane (facing +y, up).
    const floorGeo = new THREE.PlaneGeometry(
      grid.cols * CELL_SIZE,
      grid.rows * CELL_SIZE,
    );
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(
      floorGeo,
      new THREE.MeshStandardMaterial({ color: 0x3b3f4a }),
    );
    floor.position.set(0, 0, 0); // grid is centered on origin (see coords.ts)
    this.root.add(floor);

    // --- Counters: one box per 'counter' cell ----------------------------
    // Share one geometry + material across all counter boxes; we only vary
    // each mesh's position. Cheaper and simpler than per-cell geometry.
    const counterGeo = new THREE.BoxGeometry(
      CELL_SIZE,
      COUNTER_HEIGHT,
      CELL_SIZE,
    );
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x9c6b3f });

    grid.forEach((cell) => {
      if (cell.type !== 'counter') return;
      const { x, z } = gridToWorld(
        cell.pos.col,
        cell.pos.row,
        grid.cols,
        grid.rows,
      );
      const box = new THREE.Mesh(counterGeo, counterMat);
      // Box is centered on its origin, so lift it by half its height to rest
      // its base on the floor (y=0).
      box.position.set(x, COUNTER_HEIGHT / 2, z);
      this.root.add(box);
    });

    scene.add(this.root);
  }
}
