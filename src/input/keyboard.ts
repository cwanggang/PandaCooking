/**
 * KeyboardInput: the only InputSource for now. WASD = move, Space = interact.
 *
 * Listens for keydown/keyup and tracks which keys are held. On each poll(),
 * movement keys that are held produce one intent (throttled to ~8 moves/sec).
 * INTERACT is single-press only (no repeat).
 */

import type { Intent } from '../world/intents';
import type { InputSource } from './types';

const KEY_TO_INTENT: Record<string, Intent> = {
  KeyW: 'MOVE_UP',
  KeyS: 'MOVE_DOWN',
  KeyA: 'MOVE_LEFT',
  KeyD: 'MOVE_RIGHT',
  Space: 'INTERACT',
};

const MOVE_INTERVAL = 125; // ms between held-key moves

export class KeyboardInput implements InputSource {
  private buffer: Intent[] = [];
  private held = new Set<string>();
  private lastMoveTime = 0;

  private readonly target: Window | HTMLElement;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    // Ignore OS repeat so each press = one action.
    if (e.repeat) return;
    const intent = KEY_TO_INTENT[e.code];
    if (intent === undefined) return;
    e.preventDefault();
    this.held.add(e.code);
    this.buffer.push(intent);
    // Prevent held-key poll() from also emitting this same press.
    if (intent !== 'INTERACT') this.lastMoveTime = performance.now();
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  constructor(target: Window | HTMLElement = window) {
    this.target = target;
    this.target.addEventListener('keydown', this.onKeyDown as EventListener);
    this.target.addEventListener('keyup', this.onKeyUp as EventListener);
  }

  poll(): Intent[] {
    const intents = [...this.buffer];
    this.buffer = [];

    const now = performance.now();
    if (now - this.lastMoveTime >= MOVE_INTERVAL) {
      let moved = false;
      for (const code of this.held) {
        const intent = KEY_TO_INTENT[code];
        if (intent && intent !== 'INTERACT') {
          intents.push(intent);
          moved = true;
        }
      }
      if (moved) this.lastMoveTime = now;
    }

    return intents;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown as EventListener);
    this.target.removeEventListener('keyup', this.onKeyUp as EventListener);
    this.buffer = [];
    this.held.clear();
  }
}
