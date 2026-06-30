/**
 * Per-station interaction logic — "what happens when you INTERACT with this
 * kind of station". Pure logic, no rendering, no I/O: it mutates the player's
 * held item and the faced cell's held item, and returns a short message (or
 * null when the interaction did nothing).
 *
 * The switch is EXHAUSTIVE on purpose (no `default`): add a StationType in
 * types.ts and TypeScript forces you to decide what INTERACT does with it here.
 */

import type { Cell, FoodType, Item, StationType } from './types';
import type { Player } from './player';

/** What an INTERACT did, so the caller can report it without doing I/O. */
export interface InteractionResult {
  message: string;
}

/** Which raw food each crate/barrel station dispenses. Add a crate station type
 * here and it starts handing out that ingredient. */
const CRATE_FOOD: Partial<Record<StationType, FoodType>> = {
  barrel: 'carrot',
  lettuceBarrel: 'lettuce',
};

/** How long (seconds) a chop takes on the cutting board. */
export const CHOP_DURATION = 1;

/** A short human-readable name for an item, for INTERACT report messages. */
function label(item: Item): string {
  if (item.kind === 'food') return item.food;
  return item.contents.length > 0 ? 'plate of food' : 'plate';
}

/** What each raw food becomes once a chop completes. A food is choppable iff it
 * appears here; add a raw->pieces entry to make a new ingredient choppable. */
const CHOP_RESULT: Partial<Record<FoodType, FoodType>> = {
  carrot: 'carrotPieces',
  lettuce: 'lettucePieces',
};

/** Whether a food can be chopped on the cutting board. */
function isChoppable(food: FoodType): boolean {
  return food in CHOP_RESULT;
}

/** What a food becomes once a chop completes. Non-choppable foods are unchanged
 * (defensive — only choppable foods ever start a chop). */
function chopResult(food: FoodType): FoodType {
  return CHOP_RESULT[food] ?? food;
}

/**
 * Finalize a station's just-completed process. Called by world.update(dt) when
 * a cell's process reaches its duration. Clears the process and applies its
 * effect — for the cutting board, the food on it becomes its chopped result.
 */
export function completeProcess(cell: Cell): void {
  cell.process = null;
  if (cell.station === 'cuttingBoard' && cell.heldItem?.kind === 'food') {
    cell.heldItem = { kind: 'food', food: chopResult(cell.heldItem.food) };
  }
}

/**
 * Run the INTERACT between the player and the faced station cell. Mutates
 * player.heldItem and/or cell.heldItem. Returns null if nothing happened (so
 * the caller treats it as a no-op).
 */
export function interactWithStation(
  player: Player,
  cell: Cell,
): InteractionResult | null {
  switch (cell.station) {
    case 'barrel':
    case 'lettuceBarrel': {
      // Ingredient crate: an empty-handed grab spawns the crate's food into the
      // player's hands. If already carrying something, do nothing.
      if (player.heldItem !== null) return null;
      const food = CRATE_FOOD[cell.station];
      if (!food) return null;
      player.heldItem = { kind: 'food', food };
      return { message: `grabbed ${food} from crate` };
    }

    case 'dishrack':
      // Clean-plate dispenser: an empty-handed grab spawns a fresh empty plate.
      // Unlimited supply, mirroring the barrel. If already carrying something,
      // do nothing.
      if (player.heldItem !== null) return null;
      player.heldItem = { kind: 'plate', contents: [] };
      return { message: 'grabbed a plate from the dish rack' };

    case 'counter': {
      const held = player.heldItem;
      const onCounter = cell.heldItem;

      // Pile food onto a plate already resting on the counter. Unlimited.
      if (held?.kind === 'food' && onCounter?.kind === 'plate') {
        onCounter.contents.push(held.food);
        player.heldItem = null;
        return { message: `added ${held.food} to plate` };
      }
      // Put down onto an empty counter.
      if (held !== null && onCounter === null) {
        cell.heldItem = held;
        player.heldItem = null;
        return { message: `placed ${label(held)} on counter` };
      }
      // Pick up from the counter (a plate comes with its contents).
      if (held === null && onCounter !== null) {
        player.heldItem = onCounter;
        cell.heldItem = null;
        return { message: `picked up ${label(onCounter)} from counter` };
      }
      return null;
    }

    case 'cuttingBoard': {
      const held = player.heldItem;
      const onBoard = cell.heldItem;

      // While a chop is running, the board is busy — ignore interacts.
      if (cell.process !== null) return null;

      // 1. Place a single food onto an empty board (plates not allowed here).
      if (onBoard === null && held?.kind === 'food') {
        cell.heldItem = held;
        player.heldItem = null;
        return { message: `placed ${held.food} on cutting board` };
      }
      // 2. Start chopping: an empty-handed interact on a board holding a raw,
      //    choppable food. The board's knife "leaves" (render hides it) and the
      //    chop runs over CHOP_DURATION in world.update.
      if (held === null && onBoard?.kind === 'food' && isChoppable(onBoard.food)) {
        cell.process = { elapsed: 0, duration: CHOP_DURATION };
        return { message: `started chopping ${onBoard.food}` };
      }
      // 3. Pick up whatever rests on the board (e.g. the finished pieces).
      if (held === null && onBoard !== null) {
        player.heldItem = onBoard;
        cell.heldItem = null;
        return { message: `picked up ${label(onBoard)} from cutting board` };
      }
      return null;
    }

    // Special stations don't accept items yet (no placing/picking here).
    case 'stove':
    case 'delivery':
    case 'trash':
      return null;

    // selectedCell() only ever passes a station cell, but the type allows null.
    case null:
      return null;
  }
}
