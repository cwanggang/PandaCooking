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
  tomatoBarrel: 'tomato',
  bunBarrel: 'bun',
  steakBarrel: 'steak',
};

/** How long (seconds) a chop takes on the cutting board. */
export const CHOP_DURATION = 1;

/** How long (seconds) cooking a patty on a stove takes. */
export const COOK_DURATION = 7;

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
  tomato: 'tomatoPieces',
  steak: 'burgerUncooked', // a chopped steak is a raw patty
};

/** What each raw food becomes once cooked on a stove. A food is cookable iff it
 * appears here; add a raw->cooked entry to make a new ingredient cookable. */
const COOK_RESULT: Partial<Record<FoodType, FoodType>> = {
  burgerUncooked: 'burgerCooked',
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

/** Whether a food can be cooked on a stove. */
function isCookable(food: FoodType): boolean {
  return food in COOK_RESULT;
}

/** What a food becomes once cooking completes. Non-cookable foods are unchanged
 * (defensive — only cookable foods ever start cooking). */
function cookResult(food: FoodType): FoodType {
  return COOK_RESULT[food] ?? food;
}

/**
 * Finalize a station's just-completed process. Called by world.update(dt) when
 * a cell's process reaches its duration. Clears the process and applies its
 * effect — the cutting board's food becomes its chopped result; the stove's
 * patty becomes its cooked form.
 */
export function completeProcess(cell: Cell): void {
  cell.process = null;
  if (cell.heldItem?.kind !== 'food') return;
  if (cell.station === 'cuttingBoard') {
    cell.heldItem = { kind: 'food', food: chopResult(cell.heldItem.food) };
  } else if (cell.station === 'stove') {
    cell.heldItem = { kind: 'food', food: cookResult(cell.heldItem.food) };
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
    case 'lettuceBarrel':
    case 'tomatoBarrel':
    case 'bunBarrel':
    case 'steakBarrel': {
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

    case 'stove': {
      const held = player.heldItem;
      const onPan = cell.heldItem;

      // While cooking is running, the pan is busy — ignore interacts.
      if (cell.process !== null) return null;

      // 1. Place a single food into an empty pan (plates not allowed here).
      if (onPan === null && held?.kind === 'food') {
        cell.heldItem = held;
        player.heldItem = null;
        return { message: `placed ${held.food} in the pan` };
      }
      // 2. Start cooking: an empty-handed interact on a pan holding a cookable
      //    food (a raw patty). The cook runs over COOK_DURATION in world.update.
      if (held === null && onPan?.kind === 'food' && isCookable(onPan.food)) {
        cell.process = { elapsed: 0, duration: COOK_DURATION };
        return { message: `started cooking ${onPan.food}` };
      }
      // 3. Pick up whatever rests in the pan (e.g. the finished patty).
      if (held === null && onPan !== null) {
        player.heldItem = onPan;
        cell.heldItem = null;
        return { message: `picked up ${label(onPan)} from the pan` };
      }
      return null;
    }

    // Special stations don't accept items yet (no placing/picking here).
    case 'delivery':
    case 'trash':
      return null;

    // selectedCell() only ever passes a station cell, but the type allows null.
    case null:
      return null;
  }
}
