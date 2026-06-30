/**
 * CuttingBoardView: the dynamic parts of every cutting-board station — the food
 * on the board, the knife stuck in it, and the chop progress bar. (The static
 * counter base + board prop are built once by KitchenView.) Each frame this
 * reconciles those against the grid, like ItemsView does for counters. Reads the
 * world, never changes it.
 *
 * Per board the three pieces are:
 *  - knife: visible when idle, hidden while chopping (it "moves to the panda").
 *  - food: the item on the board. While chopping it shows the mid-chop form —
 *    raw for the first half, chopped for the second — then the world swaps it to
 *    the pieces result when the chop completes.
 *  - progress bar: shown only while a chop runs, filled by elapsed/duration.
 */

import * as THREE from 'three';
import type { Grid } from '../world/grid';
import type { Cell, FoodType } from '../world/types';
import type { ItemModels, PropModels } from './models';
import { buildItemMesh } from './itemMesh';
import { ProgressBar } from './progressBar';
import { gridToWorld } from '../world/coords';

/** Rest height for things sitting on the board's surface (counter top + the
 * thin board prop). Tweak alongside the cuttingboard prop scale in models.ts. */
const SURFACE_Y = 0.56;
/** Height the progress bar floats at, above the board. */
const PROGRESS_BAR_Y = 1.1;
/** Nudge the knife off-center and lean it so it reads as stuck in the board
 * (and doesn't sit right on top of the food). */
const KNIFE_OFFSET = { x: 0.18, z: -0.08 };
const KNIFE_TILT = -0.5; // radians, leaned back

/** The mid-chop appearance of a food (shown during the second half of a chop). */
const CHOPPED_FORM: Partial<Record<FoodType, FoodType>> = {
  carrot: 'carrotChopped',
  lettuce: 'lettuceChopped',
};

/** What we're currently drawing for a board's food, so we only rebuild on change. */
interface PlacedFood {
  food: FoodType | null;
  mesh: THREE.Object3D | null;
}

export class CuttingBoardView {
  private readonly scene: THREE.Scene;
  private readonly itemModels: ItemModels;

  /** Per cutting-board cell (keyed "col,row"): its world position + sub-meshes. */
  private readonly boards = new Map<
    string,
    { x: number; z: number; knife: THREE.Object3D | null; bar: ProgressBar }
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
      if (cell.station !== 'cuttingBoard') return;
      const key = keyOf(cell);
      const { x, z } = gridToWorld(cell.pos.col, cell.pos.row, cols, rows);

      // Knife stuck in the board (cloned from the prop model). Built once;
      // sync() just toggles its visibility.
      let knife: THREE.Object3D | null = null;
      const knifeModel = propModels.get('knife');
      if (knifeModel) {
        knife = knifeModel.clone();
        knife.position.set(x + KNIFE_OFFSET.x, SURFACE_Y, z + KNIFE_OFFSET.z);
        knife.rotation.z = KNIFE_TILT;
        scene.add(knife);
      }

      const bar = new ProgressBar();
      bar.setPosition(x, PROGRESS_BAR_Y, z);
      scene.add(bar.root);

      this.boards.set(key, { x, z, knife, bar });
      this.food.set(key, { food: null, mesh: null });
    });
  }

  /** Reconcile every board's knife / food / progress bar against the grid. */
  sync(grid: Grid): void {
    grid.forEach((cell) => {
      if (cell.station !== 'cuttingBoard') return;
      const key = keyOf(cell);
      const board = this.boards.get(key);
      if (!board) return;

      const chopping = cell.process !== null;

      // Knife: gone while chopping (it's "in the panda's hand").
      if (board.knife) board.knife.visible = !chopping;

      // Progress bar: visible and filled only while chopping.
      if (cell.process !== null) {
        board.bar.setProgress(cell.process.elapsed / cell.process.duration);
        board.bar.setVisible(true);
      } else {
        board.bar.setVisible(false);
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
        mesh.position.set(board.x, SURFACE_Y, board.z);
        this.scene.add(mesh);
        placed.mesh = mesh;
      }
      placed.food = wanted;
    });
  }
}

/** Which food form to draw on a board right now, or null if it's empty. */
function foodToShow(cell: Cell): FoodType | null {
  const item = cell.heldItem;
  if (item?.kind !== 'food') return null;
  if (cell.process !== null) {
    // First half of the chop shows the raw food; second half its chopped form.
    const half = cell.process.duration / 2;
    if (cell.process.elapsed >= half) return CHOPPED_FORM[item.food] ?? item.food;
  }
  return item.food;
}

function keyOf(cell: Cell): string {
  return `${cell.pos.col},${cell.pos.row}`;
}
