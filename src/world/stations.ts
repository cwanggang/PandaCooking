/**
 * Per-station interaction logic — "what happens when you INTERACT with this
 * kind of station". Pure logic, no rendering, no I/O: it mutates the player's
 * held item and the faced cell's held item, and returns a short message (or
 * null when the interaction did nothing).
 *
 * The switch is EXHAUSTIVE on purpose (no `default`): add a StationType in
 * types.ts and TypeScript forces you to decide what INTERACT does with it here.
 */

import type { Cell, ItemType } from './types';
import type { Player } from './player';

/** What an INTERACT did, so the caller can report it without doing I/O. */
export interface InteractionResult {
  message: string;
}

/** Which ingredient a crate dispenses. Just the carrot for now; later this will
 * vary per crate (carrot/onion/...). */
const CRATE_ITEM: ItemType = 'carrot';

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
      // Ingredient crate: an empty-handed grab spawns the crate's item into the
      // player's hands. If already carrying something, do nothing.
      if (player.heldItem !== null) return null;
      player.heldItem = CRATE_ITEM;
      return { message: `grabbed ${CRATE_ITEM} from crate` };

    case 'counter': {
      // Plain surface: put down if hands full and the surface is empty; pick up
      // if hands empty and the surface has something. Otherwise no-op.
      if (player.heldItem !== null && cell.heldItem === null) {
        cell.heldItem = player.heldItem;
        player.heldItem = null;
        return { message: `placed ${cell.heldItem} on counter` };
      }
      if (player.heldItem === null && cell.heldItem !== null) {
        player.heldItem = cell.heldItem;
        cell.heldItem = null;
        return { message: `picked up ${player.heldItem} from counter` };
      }
      return null;
    }

    // Special stations don't accept the carrot yet (no placing items here).
    case 'stove':
    case 'cuttingBoard':
    case 'plate':
    case 'delivery':
    case 'trash':
      return null;

    // selectedCell() only ever passes a station cell, but the type allows null.
    case null:
      return null;
  }
}
