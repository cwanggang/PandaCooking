/**
 * World: the single source of truth the whole game reads from.
 *
 * It owns the grid and the player and is the one object the renderer is allowed
 * to read and the input layer is allowed to drive (via applyIntent). Still pure:
 * no Three.js, no DOM, no console. It can be constructed and stepped headless,
 * which is what makes the logic testable and (later) deterministic for EMG.
 */

import { Grid } from './grid';
import { Player } from './player';
import { interactWithStation } from './stations';
import { KITCHEN_LAYOUT, PLAYER_SPAWN } from './layout';
import type { Intent } from './intents';
import type { GridPos, StationType } from './types';

/**
 * What an INTERACT resolved to, so the caller (game.ts) can report it without
 * the model itself doing I/O. `target` is the station kind faced, or 'floor'
 * (faced a walkable tile) or 'out-of-bounds' (faced off the grid edge).
 */
export interface InteractReport {
  pos: GridPos;
  target: StationType | 'floor' | 'out-of-bounds';
  message: string;
}

export class World {
  readonly grid: Grid;
  readonly player: Player;

  constructor() {
    this.grid = Grid.fromLayout(KITCHEN_LAYOUT);
    this.player = new Player(PLAYER_SPAWN);
  }

  /**
   * Apply one intent. Returns an InteractReport for INTERACT (so the caller can
   * log/handle it) and null for movement. Centralizing dispatch here keeps the
   * input and game layers from needing to know the player's internals.
   *
   * EXTENSION POINT: when stations exist, INTERACT will mutate the targeted
   * cell's station state here (pick up / drop / start cooking) instead of just
   * reporting it.
   */
  applyIntent(intent: Intent): InteractReport | null {
    if (intent === 'INTERACT') {
      const pos = this.player.facingCellPos();
      const cell = this.player.interactTarget(this.grid);

      if (cell === undefined) {
        return { pos, target: 'out-of-bounds', message: 'nothing there' };
      }
      if (cell.station === null) {
        return { pos, target: 'floor', message: 'just floor' };
      }
      // Dispatch to the faced station's logic (currently just a description).
      return {
        pos,
        target: cell.station,
        message: interactWithStation(cell.station),
      };
    }

    this.player.applyIntent(intent, this.grid);
    return null;
  }

  /**
   * Advance continuous simulation by a fixed timestep. A no-op today — movement
   * is event-driven, not time-driven — but it's the deterministic tick the game
   * loop calls in fixed quanta.
   *
   * EXTENSION POINT: round timers, cooking/burning progress, and other
   * time-based station logic advance here using `dt`.
   */
  update(_dt: number): void {
    // intentionally empty for now
  }
}
