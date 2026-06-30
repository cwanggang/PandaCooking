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
  | 'barrel' // raw-ingredient storage (carrots)
  | 'lettuceBarrel' // raw-ingredient storage (lettuce)
  | 'tomatoBarrel' // raw-ingredient storage (tomatoes)
  | 'bunBarrel' // raw-ingredient storage (burger buns)
  | 'steakBarrel' // raw-ingredient storage (steak)
  | 'eggBarrel' // raw-ingredient storage (eggs)
  | 'stove' // cooking
  | 'cuttingBoard' // chopping
  | 'dishrack' // clean-plate dispenser (counter + dish rack of plates)
  | 'delivery' // finished-food drop-off
  | 'trash'; // discard items

/**
 * A food/ingredient — the atomic edible things that can sit on a counter, be
 * held, or be piled onto a plate. Each chopped ingredient has three forms along
 * the chopping pipeline: raw -> chopped (a mid-chop appearance) -> pieces (the
 * result you carry away). The steak is chopped into a raw patty
 * (`burgerUncooked`) which the stove then cooks into `burgerCooked`.
 *
 * The `bun` is special: it can't be chopped or cooked, and the renderer draws it
 * as a single bun in hand but as two halves (bottom + upside-down top) once set
 * on a surface (see itemMesh.ts).
 *
 * EXTENSION POINT: add ingredients here (e.g. 'onion'). The food->model map in
 * models.ts is keyed by this, so a new food forces you to give it a model (or
 * the type-check fails).
 */
export type FoodType =
  | 'carrot'
  | 'carrotChopped'
  | 'carrotPieces'
  | 'lettuce'
  | 'lettuceChopped'
  | 'lettucePieces'
  | 'tomato'
  | 'tomatoChopped'
  | 'tomatoPieces'
  | 'bun'
  | 'steak'
  | 'steakChopped'
  | 'burgerUncooked'
  | 'burgerCooked'
  | 'eggUncooked'
  | 'eggCooked';

/**
 * A carryable item — something the player can hold and put down. Two shapes:
 *   - `food`: a single ingredient.
 *   - `plate`: a container that carries a (possibly empty) list of foods. Its
 *     `contents` travel with the plate wherever it goes (held, or resting on a
 *     counter), so picking a plate up takes its food with it automatically.
 *
 * EXTENSION POINT: add new item shapes here (e.g. a 'pot' with cooking state).
 */
export type Item =
  | { kind: 'food'; food: FoodType }
  | { kind: 'plate'; contents: FoodType[] };

/**
 * A timed, automatic process running at a station (chopping now; cooking
 * later). The world's update(dt) advances `elapsed` each tick; when it reaches
 * `duration` the station finalizes (see stations.ts completeProcess). The
 * renderer draws a progress bar from `elapsed / duration`.
 */
export interface TimedProcess {
  elapsed: number; // seconds elapsed so far
  duration: number; // total seconds the process takes
}

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
   * The item resting on this cell, or null if empty. Counters hold a carrot or
   * a plate of food; a cutting board holds the single food being processed.
   * Other cells stay null. The renderer reads it to draw items on surfaces.
   */
  heldItem: Item | null;

  /**
   * The timed process running at this station, or null when idle. Only the
   * cutting board uses it for now (chopping); the stove will later. EXTENSION
   * POINT realized: stations that gain time-based behavior hang it here, and
   * world.update(dt) advances it.
   */
  process: TimedProcess | null;
}
