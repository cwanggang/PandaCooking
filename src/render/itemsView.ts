/**
 * ItemsView: draws the items sitting on counters. The kitchen meshes are static,
 * but items appear and disappear as the player puts them down / picks them up,
 * so each frame this reconciles its meshes against the grid: a mesh exists at a
 * cell iff that cell.heldItem is set. Reads the model, never changes it.
 *
 * Held items (carried by the panda) are NOT drawn here — those live in
 * PlayerView so they follow the panda. This view is only for items at rest.
 */

import * as THREE from 'three';
import type { Grid } from '../world/grid';
import type { ItemType } from '../world/types';
import type { ItemModels } from './models';
import { gridToWorld } from '../world/coords';

/** Height an item rests at — the top of a counter (~0.5 high), so the item's
 * base (seated at y=0 by models.ts) sits on the surface. */
const ITEM_REST_HEIGHT = 0.5;

/** What we're currently drawing at a cell, so we only rebuild on change. */
interface PlacedItem {
  type: ItemType;
  mesh: THREE.Object3D;
}

export class ItemsView {
  private readonly scene: THREE.Scene;
  private readonly itemModels: ItemModels;
  private readonly cols: number;
  private readonly rows: number;

  /** Keyed by "col,row" -> the item mesh currently shown on that cell. */
  private readonly placed = new Map<string, PlacedItem>();

  constructor(
    scene: THREE.Scene,
    itemModels: ItemModels,
    cols: number,
    rows: number,
  ) {
    this.scene = scene;
    this.itemModels = itemModels;
    this.cols = cols;
    this.rows = rows;
  }

  /**
   * Reconcile drawn items with the grid. Cheap (one pass over the cells, only a
   * few of which hold items), so running it every frame is fine and keeps the
   * view a pure function of the model.
   */
  sync(grid: Grid): void {
    const seen = new Set<string>();

    grid.forEach((cell) => {
      if (cell.heldItem === null) return;
      const key = `${cell.pos.col},${cell.pos.row}`;
      seen.add(key);

      const existing = this.placed.get(key);
      if (existing && existing.type === cell.heldItem) return; // already correct
      if (existing) this.remove(key); // wrong type: rebuild

      const model = this.itemModels.get(cell.heldItem);
      if (!model) return; // no art for this item (shouldn't happen)

      const mesh = model.clone();
      const { x, z } = gridToWorld(
        cell.pos.col,
        cell.pos.row,
        this.cols,
        this.rows,
      );
      mesh.position.set(x, ITEM_REST_HEIGHT, z);
      this.scene.add(mesh);
      this.placed.set(key, { type: cell.heldItem, mesh });
    });

    // Remove meshes for cells that no longer hold an item.
    for (const key of this.placed.keys()) {
      if (!seen.has(key)) this.remove(key);
    }
  }

  private remove(key: string): void {
    const placed = this.placed.get(key);
    if (!placed) return;
    this.scene.remove(placed.mesh);
    this.placed.delete(key);
  }
}
