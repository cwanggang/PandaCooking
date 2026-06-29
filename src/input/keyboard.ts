/**
 * KeyboardInput: the only InputSource for now. WASD = move, Space = interact.
 *
 * It listens for keydown, translates each key to an Intent, and buffers them
 * until the game loop drains the buffer via poll(). It knows about keys; the
 * world knows about intents; neither knows about the other's domain. A future
 * EmgInput implements this exact same interface and main.ts won't care which
 * one it got.
 */

import type { Intent } from '../world/intents';
import type { InputSource } from './types';

/** Which physical key produces which intent. The only key-aware table. */
const KEY_TO_INTENT: Record<string, Intent> = {
  KeyW: 'MOVE_UP',
  KeyS: 'MOVE_DOWN',
  KeyA: 'MOVE_LEFT',
  KeyD: 'MOVE_RIGHT',
  Space: 'INTERACT',
};

export class KeyboardInput implements InputSource {
  /** Intents seen since the last poll(), in arrival order. */
  private buffer: Intent[] = [];

  // Stored so we can detach exactly these listeners in dispose().
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    // `e.repeat` is true for OS auto-repeat while a key is held. We ignore it so
    // movement is one cell per physical press. To get "hold to keep moving",
    // delete this guard (and the loop will step every tick the key is held).
    if (e.repeat) return;

    const intent = KEY_TO_INTENT[e.code];
    if (intent === undefined) return;

    // Stop Space/arrow-likes from scrolling the page.
    e.preventDefault();
    this.buffer.push(intent);
  };

  private readonly target: Window | HTMLElement;

  constructor(target: Window | HTMLElement = window) {
    this.target = target;
    this.target.addEventListener('keydown', this.onKeyDown as EventListener);
  }

  /** Hand over buffered intents and clear the buffer. */
  poll(): Intent[] {
    if (this.buffer.length === 0) return [];
    const drained = this.buffer;
    this.buffer = [];
    return drained;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown as EventListener);
    this.buffer = [];
  }
}
