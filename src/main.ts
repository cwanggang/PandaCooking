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

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) throw new Error('#app container not found in index.html');

const input = new KeyboardInput();
const game = new Game(container, input);
game.start();

console.log(
  'Panda Cooking running. WASD to move (one cell per press), Space to interact.',
);
