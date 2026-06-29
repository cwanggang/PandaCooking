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
 * Footprint is 9 wide x 8 tall: a 7x6 walkable interior. Stations ring the
 * edges, plus a 3x2 counter island centered in the interior (cols 3-5, rows
 * 3-4) with 2 floor cells of clearance on every side. Its top-left cell is a
 * plate dispenser ('P'); the other five are plain counters. Row 0 is the top of
 * the array == north == -z in world space.
 *
 * The special stations sit at the same edge positions they always have; the
 * cells added by widening the kitchen are plain counters ('C'). Everything
 * downstream (grid size, centering, camera framing, shadows) derives from this
 * array, so this is the only edit needed to resize or re-arrange the kitchen.
 */

import type { StationType } from './types';

export const KITCHEN_LAYOUT: string[] = [
  'C C C S S S C C C',
  'B . . . . . . . C',
  'B . . . . . . . D',
  'B . . P C C . . D',
  'B . . C C C . . C',
  'C . . . . . . . C',
  'C . . . . . . . C',
  'C X X C C T C C C',
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
