/**
 * The kitchen as DATA. Edit this array to edit the kitchen — nothing in the
 * renderer hardcodes the layout; it all derives from here via the parser.
 *
 * Char legend:
 *   'C' = counter (solid, blocks movement)
 *   '.' = floor   (walkable)
 *
 * EXTENSION POINT: to add station types later, pick new chars (e.g. 'X' for a
 * cutting board, 'S' for a stove) and extend CHAR_TO_CELL below. The grid parser
 * doesn't need to change — only the legend does.
 *
 * Footprint is 7 wide x 6 tall: a 5x4 walkable interior ringed by counters.
 * Row 0 is the top of the array == north == -z in world space.
 */

import type { CellType } from './types';

export const KITCHEN_LAYOUT: string[] = [
  'C C C C C C C',
  'C . . . . . C',
  'C . . . . . C',
  'C . . . . . C',
  'C . . . . . C',
  'C C C C C C C',
];

/**
 * Maps a layout char to its cell type. The single place chars get meaning.
 * Unknown chars throw at parse time so a typo in the layout fails loudly.
 */
export const CHAR_TO_CELL: Record<string, CellType> = {
  C: 'counter',
  '.': 'floor',
};

/**
 * Where the player starts. Must be a floor cell inside the layout above.
 * (col 2, row 2 is interior floor.) Kept here so layout + spawn stay together.
 */
export const PLAYER_SPAWN = { col: 2, row: 2 };
