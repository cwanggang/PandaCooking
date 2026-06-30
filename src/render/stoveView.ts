import * as THREE from 'three';
import type { Grid } from '../world/grid';
import type { Cell } from '../world/types';
import type { ItemModels, PropModels } from './models';
import { buildItemMesh } from './itemMesh';
import { ProgressBar } from './progressBar';
import { gridToWorld } from '../world/coords';

const SURFACE_Y = 0.7;
const PROGRESS_BAR_Y = 1.2;
const PAN_OFFSET = { x: 0.08, z: 0.0 };
const PAN_SCALE = 0.5;

interface StoveData {
  x: number;
  z: number;
  pan: THREE.Object3D | null;
  bar: ProgressBar;
}

interface PlacedFood {
  food: string | null;
  mesh: THREE.Object3D | null;
}

export class StoveView {
  private readonly scene: THREE.Scene;
  private readonly itemModels: ItemModels;

  private readonly stoves = new Map<string, StoveData>();
  private readonly food = new Map<string, PlacedFood>();

  constructor(
    scene: THREE.Scene,
    grid: Grid,
    itemModels: ItemModels,
    propModels: PropModels,
    cols: number,
    rows: number,
  ) {
    this.scene = scene;
    this.itemModels = itemModels;

    grid.forEach((cell) => {
      if (cell.station !== 'stove') return;
      const key = keyOf(cell);
      const { x, z } = gridToWorld(cell.pos.col, cell.pos.row, cols, rows);

      let pan: THREE.Object3D | null = null;
      const panModel = propModels.get('pan');
      if (panModel) {
        pan = panModel.clone();
        pan.position.set(x + PAN_OFFSET.x, SURFACE_Y, z + PAN_OFFSET.z);
        pan.scale.set(PAN_SCALE, PAN_SCALE, PAN_SCALE);
        scene.add(pan);
      }

      const bar = new ProgressBar();
      bar.setPosition(x, PROGRESS_BAR_Y, z);
      scene.add(bar.root);

      this.stoves.set(key, { x, z, pan, bar });
      this.food.set(key, { food: null, mesh: null });
    });
  }

  sync(grid: Grid): void {
    grid.forEach((cell) => {
      if (cell.station !== 'stove') return;
      const key = keyOf(cell);
      const stove = this.stoves.get(key);
      if (!stove) return;

      if (cell.process !== null) {
        stove.bar.setProgress(cell.process.elapsed / cell.process.duration);
        stove.bar.setVisible(true);
      } else {
        stove.bar.setVisible(false);
      }

      const wanted = foodToShow(cell);
      const placed = this.food.get(key)!;
      if (placed.food === wanted) return;

      if (placed.mesh) {
        this.scene.remove(placed.mesh);
        placed.mesh = null;
      }
      if (wanted !== null) {
        const mesh = buildItemMesh({ kind: 'food', food: wanted as any }, this.itemModels);
        mesh.position.set(stove.x, SURFACE_Y + 0.05, stove.z);
        this.scene.add(mesh);
        placed.mesh = mesh;
      }
      placed.food = wanted;
    });
  }
}

function foodToShow(cell: Cell): string | null {
  const item = cell.heldItem;
  if (item?.kind !== 'food') return null;
  if (cell.process !== null) {
    const half = cell.process.duration / 2;
    if (cell.process.elapsed >= half) return 'pattyCooked';
  }
  return item.food;
}

function keyOf(cell: Cell): string {
  return `${cell.pos.col},${cell.pos.row}`;
}
