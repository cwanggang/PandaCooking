/**
 * Entry point: pick an input source, build the game, start the loop.
 *
 * This is the ONLY file that names a concrete InputSource. To switch from
 * keyboard to EMG later, change the one `new KeyboardInput()` line to
 * `new EmgInput()` — nothing else in the codebase references it.
 */

import './style.css';
import { Game } from './game';
import { KeyboardInput } from './input/keyboard';
import { loadStationModels, loadItemModels } from './render/models';

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) throw new Error('#app container not found in index.html');

// Loading the glTF props is async, so the whole bootstrap is: load art first,
// then build and start the game once the models exist (the views build their
// meshes synchronously from them).
async function main(): Promise<void> {
  const [models, itemModels] = await Promise.all([
    loadStationModels(),
    loadItemModels(),
  ]);

  const input = new KeyboardInput();
  const game = new Game(container!, input, models, itemModels);
  game.start();

  console.log(
    'Panda Cooking running. WASD to move (one cell per press), Space to interact.',
  );
}

void main();
