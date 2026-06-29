/**
 * Core domain types for the world model.
 *
 * This file is pure data: no behavior, no Three.js, no DOM. Everything the
 * gameplay layers agree on lives here so the world model can run headless.
 */

/**
 * What kind of thing occupies a grid cell.
 *
 * EXTENSION POINT: future station types go here. When we add stations we'll
 * likely introduce e.g. `'cuttingBoard' | 'stove' | 'oven' | 'deliveryWindow'`.
 * They will probably all be "solid" (block movement) like a counter, but each
 * will carry its own station state in a separate structure (see Cell.station,
 * stubbed below). For now we only have the two we need.
 */
export type CellType = 'counter' | 'floor';

/**
 * The four cardinal directions the player can face/move.
 * Named by compass point so rendering and logic never argue about "up".
 */
export type Facing = 'north' | 'south' | 'east' | 'west';

/**
 * Integer grid coordinate. (col = x-ish across, row = z-ish into the screen.)
 * The world model thinks ONLY in these. World floats live in coords.ts.
 */
export interface GridPos {
  col: number;
  row: number;
}

/**
 * A single parsed cell of the kitchen.
 *
 * `solid` is precomputed from the type so movement checks are a single boolean
 * read rather than a type comparison — and so a future "floor you can't walk on"
 * (e.g. a hole) wouldn't have to be a counter.
 */
export interface Cell {
  type: CellType;
  solid: boolean;
  pos: GridPos;

  /**
   * EXTENSION POINT: station state machine lives here later (held item,
   * cooking progress, etc.). Null for now; we are not building station
   * behavior this session.
   */
  station: null;
}
