/**
 * The input abstraction — the one upfront abstraction the project wants.
 *
 * An InputSource turns *some* hardware (keyboard now, EMG muscle sensors later)
 * into the world's abstract Intents. The rest of the game depends only on this
 * interface, so swapping KeyboardInput for EmgInput is a one-line change in
 * main.ts and nothing else moves.
 *
 * Note the type comes FROM the world layer (input depends on world, not the
 * reverse) — see src/world/intents.ts.
 */

import type { Intent } from '../world/intents';

export interface InputSource {
  /**
   * Return the intents that occurred since the last poll, then clear them.
   *
   * Why poll() rather than fire callbacks? The game loop runs on a fixed
   * timestep (see game.ts). Polling lets the loop pull all pending intents at a
   * well-defined moment each tick instead of having input fire mid-frame at
   * arbitrary times. That ordering is exactly the determinism we'll want when
   * EMG sampling arrives. An InputSource buffers raw events (keydown, or later
   * an EMG classification) and drains that buffer here.
   */
  poll(): Intent[];

  /** Detach listeners / free hardware. Lets us swap sources cleanly. */
  dispose(): void;
}
