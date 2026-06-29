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
import type { Cell, GridPos, StationType } from './types';

/**
 * What an INTERACT resolved to, so the caller (game.ts) can report it without
 * the model itself doing I/O. INTERACT only fires when a station is faced (see
 * applyIntent), so `target` is always the faced station kind.
 */
export interface InteractReport {
  pos: GridPos;
  target: StationType;
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
   * The station cell the player is currently facing, or null if it faces floor
   * or off the grid edge. This is the ONE definition of "what is selected" —
   * both the INTERACT handler below and the renderer's highlight read it, so
   * they can never disagree about which station is targeted. Pure: just two
   * grid lookups, no side effects.
   */
  selectedCell(): Cell | null {
    const cell = this.player.interactTarget(this.grid); // faced cell, may be undefined
    if (cell === undefined || cell.station === null) return null;
    return cell;
  }

  /**
   * Apply one intent. Returns an InteractReport for INTERACT (so the caller can
   * log/handle it) and null for movement or an INTERACT that hit nothing.
   * Centralizing dispatch here keeps the input and game layers from needing to
   * know the player's internals.
   *
   * INTERACT only acts when a station is faced (selectedCell()): facing floor or
   * off the grid is a no-op. That is the "can only interact with what you face"
   * rule.
   *
   * EXTENSION POINT: this is the seam for pickup/putdown — when a station is
   * selected, INTERACT will mutate that cell's station state (pick up / drop /
   * start cooking) based on what the player is holding, instead of just
   * reporting it.
   */
  applyIntent(intent: Intent): InteractReport | null {
    if (intent === 'INTERACT') {
      const cell = this.selectedCell();
      if (cell === null || cell.station === null) return null; // nothing faced
      const result = interactWithStation(this.player, cell);
      if (result === null) return null; // interaction did nothing
      return { pos: cell.pos, target: cell.station, message: result.message };
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
