/**
 * The player as pure logic: a grid position + a facing direction, and the rules
 * for how intents change them. No rendering, no Three.js. The renderer will read
 * `pos` and `facing` and draw a mesh to match.
 */

import type { Facing, GridPos, Cell, Item } from './types';
import type { Intent } from './intents';
import type { Grid } from './grid';

/** How each facing translates to a step on the grid. One source of truth. */
const FACING_DELTA: Record<Facing, GridPos> = {
  north: { col: 0, row: -1 }, // -row = -z = "up"/away on screen
  south: { col: 0, row: 1 },
  east: { col: 1, row: 0 }, // +col = +x = right on screen
  west: { col: -1, row: 0 },
};

/**
 * Which facing a movement intent implies. INTERACT is absent (not a move).
 * Screen-relative -> grid happens here, in the world model, exactly once.
 */
const MOVE_INTENT_FACING: Partial<Record<Intent, Facing>> = {
  MOVE_UP: 'north',
  MOVE_DOWN: 'south',
  MOVE_LEFT: 'west',
  MOVE_RIGHT: 'east',
};

export class Player {
  pos: GridPos;
  facing: Facing;

  /**
   * The item the player is carrying, or null when empty-handed. The interaction
   * logic (world/stations.ts) moves items between this and a counter cell's
   * heldItem; the renderer draws this in front of the panda.
   */
  heldItem: Item | null = null;

  constructor(spawn: GridPos, facing: Facing = 'south') {
    // Copy the spawn so external layout data can't be mutated by movement.
    this.pos = { col: spawn.col, row: spawn.row };
    this.facing = facing;
  }

  /**
   * Apply one intent against the world.
   *
   * Movement is grid-snapped and "turn-then-step": a move intent always updates
   * facing (so you can turn to face a counter without walking into it), then
   * steps one cell only if the target is walkable. Collision is a single grid
   * lookup — the only collision rule in the game.
   *
   * INTERACT doesn't change state yet; it just reports the targeted cell. We
   * keep that reporting out here (game.ts logs it) so the model stays free of
   * console side effects and remains headless-testable.
   */
  applyIntent(intent: Intent, grid: Grid): void {
    if (intent === 'INTERACT') return; // handled by caller via interactTarget()

    const facing = MOVE_INTENT_FACING[intent];
    if (facing === undefined) return; // unknown/non-move intent: ignore

    // Always turn to face the pressed direction...
    this.facing = facing;

    // ...then step only if the destination cell is walkable.
    const delta = FACING_DELTA[facing];
    const nextCol = this.pos.col + delta.col;
    const nextRow = this.pos.row + delta.row;
    if (grid.isWalkable(nextCol, nextRow)) {
      this.pos.col = nextCol;
      this.pos.row = nextRow;
    }
  }

  /** The grid cell directly in front of the player (may be out of bounds). */
  facingCellPos(): GridPos {
    const delta = FACING_DELTA[this.facing];
    return { col: this.pos.col + delta.col, row: this.pos.row + delta.row };
  }

  /**
   * The cell the player would interact with: the one directly in front.
   * Returns undefined if that's off the grid. Stations will hang off this later.
   */
  interactTarget(grid: Grid): Cell | undefined {
    const target = this.facingCellPos();
    return grid.cellAt(target.col, target.row);
  }
}
