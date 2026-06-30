/**
 * StoveView: the dynamic parts of every stove station — the pan that sits on the
 * burner, the food cooking in it, and the cook progress bar. (The static stove
 * mesh is built once by KitchenView.) Each frame this reconciles those against
 * the grid, like CuttingBoardView does for boards. Reads the world, never
 * changes it.
 *
 * Per stove the pieces are:
 *  - pan: always visible, seated on the stovetop (built once, never moves).
 *  - food: the item in the pan. Usually drawn as-is (the world swaps it to its
 *    cooked form when the cook completes), but a food in COOKING_FORM shows its
 *    cooked look immediately for the whole cook — the egg does this on purpose.
 *  - progress bar: shown only while a cook runs, filled by elapsed/duration.
 */

import * as THREE from 'three';
import type { Grid } from '../world/grid';
import type { Cell, FoodType } from '../world/types';
import type { ItemModels, PropModels } from './models';
import { buildItemMesh } from './itemMesh';
import { ProgressBar } from './progressBar';
import { gridToWorld } from '../world/coords';

/** Height of the stove's cooking surface, where the pan sits. Tweak alongside
 * the stove model scale in models.ts. */
const STOVE_TOP_Y = 0.5;
/** Rest height for food in the pan (the stovetop plus the pan's lip). */
const PAN_FOOD_Y = STOVE_TOP_Y + 0.07;
/** Height the progress bar floats at, above the pan. */
const PROGRESS_BAR_Y = 1.15;

/**
 * Foods that look cooked the moment cooking starts (rather than at the end). The
 * egg is the lone case — its cooked mesh just reads better in the pan. The food's
 * real state still flips only when the timer completes (see world/stations.ts).
 */
const COOKING_FORM: Partial<Record<FoodType, FoodType>> = {
  eggUncooked: 'eggCooked',
};

/** What we're currently drawing for a stove's food, so we only rebuild on change. */
interface PlacedFood {
  food: FoodType | null;
  mesh: THREE.Object3D | null;
}

export class StoveView {
  private readonly scene: THREE.Scene;
  private readonly itemModels: ItemModels;

  /** Per stove cell (keyed "col,row"): its world position + progress bar. */
  private readonly stoves = new Map<
    string,
    { x: number; z: number; bar: ProgressBar }
  >();
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

      // Pan seated on the burner (cloned from the prop model). Built once and
      // never touched again — it's always on the stove.
      const panModel = propModels.get('pan');
      if (panModel) {
        const pan = panModel.clone();
        pan.position.set(x, STOVE_TOP_Y, z);
        scene.add(pan);
      }

      const bar = new ProgressBar();
      bar.setPosition(x, PROGRESS_BAR_Y, z);
      scene.add(bar.root);

      this.stoves.set(key, { x, z, bar });
      this.food.set(key, { food: null, mesh: null });
    });
  }

  /** Reconcile every stove's food / progress bar against the grid. */
  sync(grid: Grid): void {
    grid.forEach((cell) => {
      if (cell.station !== 'stove') return;
      const key = keyOf(cell);
      const stove = this.stoves.get(key);
      if (!stove) return;

      // Progress bar: visible and filled only while cooking.
      if (cell.process !== null) {
        stove.bar.setProgress(cell.process.elapsed / cell.process.duration);
        stove.bar.setVisible(true);
      } else {
        stove.bar.setVisible(false);
      }

      // Food mesh: rebuild only when the shown form changes.
      const wanted = foodToShow(cell);
      const placed = this.food.get(key)!;
      if (placed.food === wanted) return;

      if (placed.mesh) {
        this.scene.remove(placed.mesh);
        placed.mesh = null;
      }
      if (wanted !== null) {
        const mesh = buildItemMesh({ kind: 'food', food: wanted }, this.itemModels);
        mesh.position.set(stove.x, PAN_FOOD_Y, stove.z);
        this.scene.add(mesh);
        placed.mesh = mesh;
      }
      placed.food = wanted;
    });
  }
}

/** Which food form to draw in a pan right now, or null if it's empty. While
 * cooking, a food in COOKING_FORM shows its cooked look for the whole cook. */
function foodToShow(cell: Cell): FoodType | null {
  const item = cell.heldItem;
  if (item?.kind !== 'food') return null;
  if (cell.process !== null) return COOKING_FORM[item.food] ?? item.food;
  return item.food;
}

function keyOf(cell: { pos: { col: number; row: number } }): string {
  return `${cell.pos.col},${cell.pos.row}`;
}
