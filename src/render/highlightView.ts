/**
 * HighlightView: draws the "you are targeting this station" selection cue. Each
 * frame it READS which cell is selected (World.selectedCell()) and moves a
 * single translucent white box over that cell, or hides it when nothing is
 * faced. Like PlayerView, it only ever reads the model and writes mesh state.
 *
 * The cue is a separate overlay mesh rather than a tint on the station itself,
 * because station materials are shared across cells (and across model clones) —
 * tinting one would tint them all. A moved/toggled overlay stays decoupled and
 * works the same over a real KayKit model or a placeholder box.
 */

import * as THREE from 'three';
import type { Cell } from '../world/types';
import { CELL_SIZE, gridToWorld } from '../world/coords';

/** A touch larger than a cell so the wash clearly frames the station. */
const HIGHLIGHT_FOOTPRINT = CELL_SIZE * 1.02;
/** Tall enough to cover the counters/stations (which sit ~0.5–0.6 high). */
const HIGHLIGHT_HEIGHT = 0.7;

export class HighlightView {
  private readonly mesh: THREE.Mesh;
  private readonly cols: number;
  private readonly rows: number;

  constructor(scene: THREE.Scene, cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        HIGHLIGHT_FOOTPRINT,
        HIGHLIGHT_HEIGHT,
        HIGHLIGHT_FOOTPRINT,
      ),
      // Basic (unlit) so the wash is a flat, consistent white regardless of the
      // lighting. depthWrite:false lets it blend over the station without
      // z-fighting; it still respects depth testing so it sits in the scene.
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    this.mesh.visible = false; // nothing selected at spawn
    scene.add(this.mesh);
  }

  /**
   * Sync the cue to the current selection. Called every render frame with the
   * faced station cell, or null when the player faces floor / off the grid.
   */
  sync(cell: Cell | null): void {
    if (cell === null) {
      this.mesh.visible = false;
      return;
    }

    const { x, z } = gridToWorld(cell.pos.col, cell.pos.row, this.cols, this.rows);
    // Box is centered on its origin, so lift it half its height to rest on y=0.
    this.mesh.position.set(x, HIGHLIGHT_HEIGHT / 2, z);
    this.mesh.visible = true;
  }
}
