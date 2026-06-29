/**
 * Core domain types for the world model.
 *
 * This file is pure data: no behavior, no Three.js, no DOM. Everything the
 * gameplay layers agree on lives here so the world model can run headless.
 */

/**
 * The coarse kind of a cell: somewhere you can walk, or a solid station.
 * Every non-floor cell is a station of some StationType (below). If we ever
 * need a plain solid wall that's NOT a station, it would become a third value.
 */
export type CellType = 'floor' | 'station';

/**
 * Which kind of station a cell is. This drives both its color (render layer)
 * and its interaction logic (world/stations.ts). All stations are solid.
 *
 * EXTENSION POINT: add new stations here (e.g. 'oven', 'sink'). The exhaustive
 * switch in stations.ts will then force you to give the new one behavior, and
 * the color map in kitchenView.ts will force you to give it a color.
 */
export type StationType =
  | 'counter' // regular surface — can hold items
  | 'barrel' // raw-ingredient storage
  | 'stove' // cooking
  | 'cuttingBoard' // chopping
  | 'plate' // clean-plate dispenser
  | 'delivery' // finished-food drop-off
  | 'trash'; // discard items

/**
 * A carryable item — something the player can hold and put down. Just the raw
 * carrot for now.
 *
 * EXTENSION POINT: add ingredients/plates/pots here (e.g. 'carrotChopped',
 * 'plate', 'pot'). The item->model map in models.ts is keyed by this, so a new
 * item forces you to give it a model (or the type-check fails).
 */
export type ItemType = 'carrot';

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
   * Which station this cell is, or null for floor. For now this is just the
   * type tag used to color the cell and to dispatch interaction logic.
   *
   * EXTENSION POINT: when stations gain more runtime STATE (a stove's cooking
   * progress, etc.), this will grow from a bare StationType into an object like
   * `{ type: StationType; ... }`.
   */
  station: StationType | null;

  /**
   * The item resting on this cell, or null if empty. Only counters use this for
   * now (you can put a carrot down on a counter); other cells stay null. The
   * renderer reads it to draw items sitting on surfaces.
   */
  heldItem: ItemType | null;
}
