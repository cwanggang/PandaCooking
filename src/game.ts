/**
 * Game: the orchestrator. It owns one instance of each layer and runs the loop
 * that ties them together in the spec's one-way flow:
 *
 *     input.poll()  ->  world updates  ->  renderer reads world and draws
 *
 * It is the ONLY place the three layers meet. The world never imports the
 * renderer; the renderer never decides gameplay; input only emits intents.
 */

import { World } from './world/world';
import type { Intent } from './world/intents';
import type { InputSource } from './input/types';
import { SceneView } from './render/scene';
import { KitchenView } from './render/kitchenView';
import { PlayerView } from './render/playerView';

/**
 * Fixed simulation step: 60 logic ticks per second.
 *
 * Why fixed-timestep (accumulator pattern) instead of stepping by the raw frame
 * delta? Determinism. The sim always advances in identical 1/60 quanta no matter
 * the display refresh rate or frame hitches, so the same inputs produce the same
 * result every run. That matters now for predictable behavior and later for EMG
 * sampling, which wants a steady clock. Rendering then happens once per animation
 * frame, after the sim has caught up.
 */
const STEP_SECONDS = 1 / 60;

/** Clamp huge deltas (e.g. after the tab was backgrounded) so we don't try to
 * simulate thousands of steps at once — the "spiral of death" guard. */
const MAX_FRAME_SECONDS = 0.25;

export class Game {
  private readonly world = new World();
  private readonly sceneView: SceneView;
  private readonly kitchenView: KitchenView;
  private readonly playerView: PlayerView;

  private readonly input: InputSource;

  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;

  /** Intents pulled from input, waiting to be consumed by the next sim step. */
  private pendingIntents: Intent[] = [];

  constructor(container: HTMLElement, input: InputSource) {
    this.input = input;
    // Build the renderer from the world: views read the grid to size themselves.
    this.sceneView = new SceneView(container);
    this.kitchenView = new KitchenView(this.world.grid, this.sceneView.scene);
    this.playerView = new PlayerView(
      this.sceneView.scene,
      this.world.grid.cols,
      this.world.grid.rows,
    );
    void this.kitchenView; // built for side effect (meshes added to scene)
  }

  start(): void {
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }

  /** One animation frame: gather input, advance sim in fixed steps, draw. */
  private readonly frame = (now: number): void => {
    const frameSeconds = Math.min(
      (now - this.lastTime) / 1000,
      MAX_FRAME_SECONDS,
    );
    this.lastTime = now;
    this.accumulator += frameSeconds;

    // Drain input ONCE per frame into the pending queue. The fixed steps below
    // consume it. (Polling here, at a defined point, is why poll() exists
    // instead of input firing callbacks mid-frame.)
    const intents = this.input.poll();
    for (const intent of intents) this.pendingIntents.push(intent);

    // Advance the simulation in fixed quanta until it has caught up to realtime.
    while (this.accumulator >= STEP_SECONDS) {
      this.step(STEP_SECONDS);
      this.accumulator -= STEP_SECONDS;
    }

    // Render reads the (now up-to-date) model. Movement is grid-snapped so there
    // is nothing to interpolate yet; if we add smooth motion later, the leftover
    // `this.accumulator / STEP_SECONDS` is the interpolation alpha to pass here.
    this.playerView.sync(this.world.player);
    this.sceneView.render();

    this.rafId = requestAnimationFrame(this.frame);
  };

  /** One fixed simulation step: apply queued intents, then advance time. */
  private step(dt: number): void {
    if (this.pendingIntents.length > 0) {
      for (const intent of this.pendingIntents) {
        const report = this.world.applyIntent(intent);
        if (report) {
          // INTERACT proof-of-life: log the cell the player is facing. This is
          // the only place INTERACT does anything yet (no station logic).
          console.log(
            `INTERACT -> (col ${report.pos.col}, row ${report.pos.row}) ` +
              `[${report.target}]: ${report.message}`,
          );
        }
      }
      this.pendingIntents.length = 0; // consumed
    }
    this.world.update(dt);
  }
}
