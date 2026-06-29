/**
 * The kitchen as DATA. Edit this array to edit the kitchen — nothing in the
 * renderer hardcodes the layout; it all derives from here via the parser.
 *
 * Char legend:
 *   '.' = floor (walkable). Everything else is a solid station:
 *   'C' = counter        (light tan — regular surface, can hold items)
 *   'B' = barrel         (brown   — raw-ingredient storage)
 *   'S' = stove          (red     — cooking)
 *   'X' = cutting board  (orange  — chopping)
 *   'P' = plate          (white   — clean-plate dispenser)
 *   'D' = delivery       (green   — finished-food drop-off)
 *   'T' = trash          (blue    — discard items)
 *
 * To add a station type: pick a new char and add it to CHAR_TO_STATION below;
 * the parser, colors, and interaction switch then tell you what else to fill in.
 *
 * Footprint is 7 wide x 6 tall: a 5x4 walkable interior ringed by stations.
 * Row 0 is the top of the array == north == -z in world space.
 */

import type { StationType } from './types';

export const KITCHEN_LAYOUT: string[] = [
  'C C C S S S C',
  'B . . . . . C',
  'B . . . . . D',
  'B . . . . . D',
  'B . . . . . C',
  'C X X C C T C',
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
  B: 'barrel',
  S: 'stove',
  X: 'cuttingBoard',
  P: 'plate',
  D: 'delivery',
  T: 'trash',
};

/**
 * Where the player starts. Must be a floor cell inside the layout above.
 * (col 2, row 2 is interior floor.) Kept here so layout + spawn stay together.
 */
export const PLAYER_SPAWN = { col: 2, row: 2 };
