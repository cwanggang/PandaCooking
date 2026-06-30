/**
 * KitchenView: turns the world's Grid into meshes — a real KayKit prop per
 * station cell where we have one (see models.ts), a colored placeholder box
 * otherwise, plus a floor plane. The kitchen is static, so we build the meshes
 * ONCE in the constructor and never touch them again. This module reads the
 * model and draws; it makes no gameplay decisions.
 *
 * Every position goes through gridToWorld() so meshes land exactly on cells.
 */

import * as THREE from 'three';
import type { Grid } from '../world/grid';
import type { StationType } from '../world/types';
import { CELL_SIZE, gridToWorld } from '../world/coords';
import type { StationModels, PropModels, PropType } from './models';

/** How tall a counter box stands above the floor (world units). */
const COUNTER_HEIGHT = 0.5;

/**
 * Stations that are really "a counter with a prop on top": we render the same
 * counter base and seat the named prop on it. Keeps the dish rack and cutting
 * board from each needing their own kind of furniture. (The cutting board's
 * knife and food are dynamic — drawn by CuttingBoardView, not here.)
 */
const COUNTER_TOP_PROPS: Partial<Record<StationType, PropType>> = {
  dishrack: 'dishrack',
  cuttingBoard: 'cuttingboard',
  stove: 'pan',
};

/**
 * The color of each station type. PRESENTATION ONLY — the world model never
 * sees these; it only knows the StationType. Temporary color-coding until real
 * models replace the boxes. The map is keyed by every StationType, so adding a
 * new station forces you to give it a color here (TypeScript will complain).
 */
const STATION_COLORS: Record<StationType, number> = {
  counter: 0xd2b48c, // light tan
  barrel: 0x8b5a2b, // brown
  bunBarrel: 0xf4d03f, // yellow (bun)
  pattyBarrel: 0xb03a2e, // red-brown (meat)
  lettuceBarrel: 0x52be80, // green (lettuce)
  cheeseBarrel: 0xf7dc6f, // yellow (cheese)
  stove: 0xcc3333, // red
  cuttingBoard: 0xe8923a, // orange
  dishrack: 0xd2b48c, // tan (counter-toned; only the box fallback uses this)
  delivery: 0x3cb371, // green
  trash: 0x3a3a3a, // dark gray
};

export class KitchenView {
  /** A group holding all kitchen meshes, added to the scene as one unit. */
  readonly root: THREE.Group;

  private trashMesh: THREE.Object3D | null = null;
  private trashBaseScale = 1;
  private trashOpenT = 0; // seconds remaining in the "open" animation

  constructor(
    grid: Grid,
    scene: THREE.Scene,
    models: StationModels,
    props: PropModels,
  ) {
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
    floor.receiveShadow = true; // counters/player cast shadows onto the floor
    this.root.add(floor);

    // --- Stations: one box per station cell, colored by type -------------
    // Geometry is shared across all boxes (same size); only position and color
    // vary. We cache one material per StationType so the dozen-or-so boxes don't
    // each allocate their own.
    const counterGeo = new THREE.BoxGeometry(
      CELL_SIZE,
      COUNTER_HEIGHT,
      CELL_SIZE,
    );
    const materials = new Map<StationType, THREE.Material>();
    const materialFor = (s: StationType): THREE.Material => {
      let mat = materials.get(s);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({ color: STATION_COLORS[s] });
        materials.set(s, mat);
      }
      return mat;
    };

    // Place a colored placeholder box (used as the fallback for any station
    // without a real model). Box is centered on its origin, so lift it by half
    // its height to rest its base on the floor (y=0).
    const addBox = (station: StationType, x: number, z: number): void => {
      const box = new THREE.Mesh(counterGeo, materialFor(station));
      box.position.set(x, COUNTER_HEIGHT / 2, z);
      box.castShadow = true; // stations throw shadows...
      box.receiveShadow = true; // ...and catch the player's/each other's
      this.root.add(box);
    };

    // Place a counter base at a cell: the real counter model if we have one,
    // else a counter-colored box. Used for plain counters and under the rack.
    const addCounterBase = (x: number, z: number): void => {
      const counterModel = models.get('counter');
      if (counterModel) {
        const prop = counterModel.clone();
        prop.position.set(x, 0, z);
        this.root.add(prop);
        return;
      }
      addBox('counter', x, z);
    };

    grid.forEach((cell) => {
      if (cell.station === null) return; // floor cells get no mesh
      const { x, z } = gridToWorld(
        cell.pos.col,
        cell.pos.row,
        grid.cols,
        grid.rows,
      );

      // "Counter + prop on top" stations (dish rack, cutting board): a counter
      // base with the station's prop seated on its surface.
      const topProp = COUNTER_TOP_PROPS[cell.station];
      if (topProp) {
        addCounterBase(x, z);
        const prop = props.get(topProp);
        if (prop) {
          const mesh = prop.clone();
          mesh.position.set(x, COUNTER_HEIGHT, z); // base sits on the counter top
          this.root.add(mesh);
        }
        return;
      }

      // Prefer a real KayKit prop; fall back to the colored box for stations
      // that don't have a model yet. Both are placed by their base on y=0.
      const model = models.get(cell.station);
      if (model) {
        const prop = model.clone();
        prop.position.set(x, 0, z);

        // Trash can: render smaller, keep reference for animations
        if (cell.station === 'trash') {
          prop.scale.multiplyScalar(0.5);
          this.trashBaseScale = prop.scale.x;
          prop.position.y = 0.05;
          this.trashMesh = prop;
        }

        this.root.add(prop);
        return;
      }

      addBox(cell.station, x, z);
    });

    scene.add(this.root);
  }

  /** Trigger the trash can "open" animation (scale pop). */
  animateTrash(): void {
    this.trashOpenT = 0.3;
  }

  /** Advance trash animation by dt seconds. */
  update(dt: number): void {
    if (!this.trashMesh) return;

    // Idle gentle bob
    this.trashMesh.position.y = Math.sin(performance.now() / 400) * 0.015;

    // Open animation: quick scale pulse
    if (this.trashOpenT > 0) {
      this.trashOpenT -= dt;
      const t = this.trashOpenT / 0.3;
      const pop = 1 + Math.sin(t * Math.PI) * 0.15;
      this.trashMesh.scale.setScalar(this.trashBaseScale * pop);
    }
  }


}
