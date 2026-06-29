/**
 * The Grid: the parsed, typed kitchen. Source of truth for "what is at (col,row)"
 * and "can I stand there". Pure logic — no Three.js, no DOM.
 */

import type { Cell, GridPos } from './types';
import { CHAR_TO_CELL } from './layout';

export class Grid {
  readonly cols: number;
  readonly rows: number;

  /** Row-major: cells[row][col]. */
  private readonly cells: Cell[][];

  private constructor(cells: Cell[][], cols: number, rows: number) {
    this.cells = cells;
    this.cols = cols;
    this.rows = rows;
  }

  /**
   * Parse the char-array layout into typed cells.
   *
   * Each layout line is space-separated for human readability
   * ('C . . . C'), so we split on whitespace to get the columns. We validate
   * that every row has the same width and that every char is known — a bad
   * layout should fail loudly at startup, not produce a silently broken map.
   */
  static fromLayout(layout: string[]): Grid {
    const rows = layout.length;
    if (rows === 0) throw new Error('Kitchen layout is empty.');

    const cells: Cell[][] = [];
    let cols = -1;

    for (let row = 0; row < rows; row++) {
      const tokens = layout[row].trim().split(/\s+/);
      if (cols === -1) cols = tokens.length;
      else if (tokens.length !== cols) {
        throw new Error(
          `Layout row ${row} has ${tokens.length} cols, expected ${cols}.`,
        );
      }

      const rowCells: Cell[] = [];
      for (let col = 0; col < cols; col++) {
        const ch = tokens[col];
        const type = CHAR_TO_CELL[ch];
        if (type === undefined) {
          throw new Error(`Unknown layout char '${ch}' at (${col},${row}).`);
        }
        rowCells.push({
          type,
          // Only counters block movement today. Precomputed so movement checks
          // are a boolean read. Future solid station types set this too.
          solid: type === 'counter',
          pos: { col, row },
          station: null,
        });
      }
      cells.push(rowCells);
    }

    return new Grid(cells, cols, rows);
  }

  /** Is (col,row) inside the grid bounds? */
  inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  /** The cell at (col,row), or undefined if out of bounds. */
  cellAt(col: number, row: number): Cell | undefined {
    if (!this.inBounds(col, row)) return undefined;
    return this.cells[row][col];
  }

  /**
   * Can the player stand on (col,row)? Must be in bounds and not solid.
   * This is the ONLY collision rule in the game — a flat-grid lookup, exactly
   * as the spec wants (no 3D physics).
   */
  isWalkable(col: number, row: number): boolean {
    const cell = this.cellAt(col, row);
    return cell !== undefined && !cell.solid;
  }

  /** Iterate every cell (used by the renderer to build meshes). */
  forEach(fn: (cell: Cell, pos: GridPos) => void): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        fn(this.cells[row][col], { col, row });
      }
    }
  }
}
