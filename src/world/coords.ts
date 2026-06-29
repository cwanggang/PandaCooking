/**
 * The single bridge between grid space (what gameplay uses) and world space
 * (what the renderer uses). EVERY mesh position in the renderer must be routed
 * through gridToWorld() so meshes land exactly on cells.
 *
 * Conventions (see project spec):
 *   - Grid coords: integer (col, row).
 *   - World coords: float (x, y, z), Y is UP, the floor is the XZ plane.
 *   - Scale: 1 grid cell = 1 world unit.
 *
 * Centering: we want the kitchen centered on the world origin so the fixed
 * camera can aim at (0,0,0). Given a grid of `cols` x `rows`, we subtract half
 * the extent so the middle of the grid sits at x=z=0. We pass the grid size in
 * rather than hardcoding it, so editing the layout array can't desync this.
 */

import type { GridPos } from './types';

/** Size of one cell in world units. 1 cell = 1 unit by spec. */
export const CELL_SIZE = 1;

/**
 * Map a grid cell to the world-space position of that cell's CENTER on the
 * floor plane (y is left to the caller — counters sit higher than the floor).
 *
 * col increases toward +x, row increases toward +z. So "north" (decreasing
 * row) points toward -z, which is "away into the screen" given our camera.
 */
export function gridToWorld(
  col: number,
  row: number,
  cols: number,
  rows: number,
): { x: number; z: number } {
  // Center the grid on the origin: cell centers are offset by 0.5, then we
  // shift the whole board left/back by half its extent.
  const x = (col + 0.5) * CELL_SIZE - (cols * CELL_SIZE) / 2;
  const z = (row + 0.5) * CELL_SIZE - (rows * CELL_SIZE) / 2;
  return { x, z };
}

/**
 * Inverse of gridToWorld: which cell does a world-space (x, z) fall in?
 * Not needed for keyboard play, but essential later (e.g. mapping a pointer
 * ray or an EMG-targeted world point back onto the grid). Rounds to nearest.
 */
export function worldToGrid(
  x: number,
  z: number,
  cols: number,
  rows: number,
): GridPos {
  const col = Math.round((x + (cols * CELL_SIZE) / 2) / CELL_SIZE - 0.5);
  const row = Math.round((z + (rows * CELL_SIZE) / 2) / CELL_SIZE - 0.5);
  return { col, row };
}
