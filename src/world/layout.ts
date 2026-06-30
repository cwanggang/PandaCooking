/**
 * The kitchen as DATA. Edit this array to edit the kitchen — nothing in the
 * renderer hardcodes the layout; it all derives from here via the parser.
 *
 * Char legend:
 *   '.' = floor (walkable). Everything else is a solid station:
 *   'C' = counter        (light tan — regular surface, can hold items)
 *   'U' = bun barrel     (dispenses buns)
 *   'M' = meat barrel    (dispenses raw patties)
 *   'L' = lettuce barrel (dispenses lettuce)
 *   'H' = cheese barrel  (dispenses cheese)
 *   'S' = stove          (red     — cooking)
 *   'X' = cutting board  (counter — chopping, board + knife on top)
 *   'P' = dish rack      (counter — clean-plate dispenser, plates on top)
 *   'D' = delivery       (green   — finished-food drop-off)
 *   'T' = trash          (blue    — discard items)
 *
 * To add a station type: pick a new char and add it to CHAR_TO_STATION below;
 * the parser, colors, and interaction switch then tell you what else to fill in.
 *
 * Footprint is 7 wide x 7 tall: a 2-cell walkable corridor ringing a 3x3
 * counter island at the center (cols 2-4, rows 2-4). Three corner cells are
 * plate dispensers ('P') for easy access. Row 0 is the top of the array == north
 * == -z in world
 * space.
 */

import type { StationType } from './types';

export const KITCHEN_LAYOUT: string[] = [
  'C C S S S C C',
  'M . . . . . C',
  'U . P C C . D',
  'L . C C C . D',
  'H . C C P . C',
  'C . . . . . C',
  'C X X C T C C',
];

/** The one char that means walkable floor. Everything else is a station. */
export const FLOOR_CHAR = '.';

/**
 * Maps a layout char to its station type. The single place chars get meaning.
 * Unknown chars (that aren't FLOOR_CHAR) throw at parse time so a typo in the
 * layout fails loudly instead of producing a silently broken kitchen.
 */
export const CHAR_TO_STATION: Record<string, StationType> = {
  C: 'counter',
  U: 'bunBarrel',
  M: 'pattyBarrel',
  L: 'lettuceBarrel',
  H: 'cheeseBarrel',
  S: 'stove',
  X: 'cuttingBoard',
  P: 'dishrack',
  D: 'delivery',
  T: 'trash',
};

/**
 * Where the player starts. Must be a floor cell inside the layout above.
 * (col 2, row 2 is interior floor.) Kept here so layout + spawn stay together.
 */
export const PLAYER_SPAWN = { col: 1, row: 1 };
