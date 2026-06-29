# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server (hot reload) for local play.
- `npm run build` — type-check with `tsc` then produce a production bundle (`vite build`). This is also the lint/type-check gate: there is no separate linter, but `tsconfig.json` enables `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`, so `tsc` is strict.
- `npm run preview` — serve the built `dist/` to verify a production build.

There is **no test runner** configured yet. The world layer (`src/world/`) is written to be headless and pure specifically so it can be unit-tested later; if you add tests, keep them against that layer.

## Architecture

A Three.js "Overcooked-style" kitchen game. The defining constraint is a **strict one-way data flow across three layers**, with the world model kept completely pure (no Three.js, no DOM, no `console`):

```
input.poll()  ->  world updates  ->  renderer reads world and draws
```

`src/game.ts` (the `Game` class) is the **only** place the three layers meet. The world never imports the renderer; the renderer never decides gameplay; input only emits abstract intents. Preserve this — do not add cross-layer imports.

### The three layers

- **world/** — pure game logic, runnable headless. `World` (`world.ts`) owns the `Grid` and `Player` and is the single source of truth. `applyIntent()` is the one entry point that mutates state; `update(dt)` advances continuous time (currently a no-op). The world thinks **only in integer grid coords** (`GridPos`); world-space floats live solely in `coords.ts`.
- **input/** — `InputSource` interface (`poll()` returns buffered `Intent[]` and clears them; `dispose()`). `KeyboardInput` is the only implementation (WASD = move, Space = interact). The loop polls once per frame for determinism rather than using callbacks.
- **render/** — reads the world and draws. `SceneView` owns the renderer/camera/lights. `KitchenView` builds static station meshes once from the grid. `PlayerView.sync()` is the only per-frame "view follows model" step.

### Key invariants

- **Intents are the input/world contract.** `Intent` (`world/intents.ts`) lives in the *world* layer, not input/, because data flows input → world. Input depends on world, never the reverse. Swapping keyboard for another source (the project anticipates EMG muscle sensors) is meant to be a **one-line change in `main.ts`** — it's the only file that names a concrete `InputSource`.
- **All grid↔world conversion goes through `coords.ts`.** Every mesh position in the renderer must route through `gridToWorld()`. 1 grid cell = 1 world unit; Y is up; the grid is centered on the origin so the fixed camera aims at (0,0,0). Directions are screen-relative; the screen→grid mapping happens once, in `player.ts`.
- **The game loop is fixed-timestep** (`game.ts`): the sim advances in 1/60s quanta via an accumulator, with a `MAX_FRAME_SECONDS` spiral-of-death guard; rendering happens once per animation frame. This is for determinism (and future EMG sampling). Movement is grid-snapped, so there's no interpolation yet — `accumulator / STEP_SECONDS` is where the interpolation alpha would feed in.

### Adding a station type (the canonical extension)

Stations are data-driven and the type system enforces completeness. To add one:
1. Add the variant to `StationType` in `world/types.ts`.
2. Pick a layout char and register it in `CHAR_TO_STATION` in `world/layout.ts` (the kitchen itself is the `KITCHEN_LAYOUT` char-array there — edit that array to edit the kitchen).
3. The exhaustive `switch` in `world/stations.ts` (no `default`) and the `STATION_COLORS` map in `render/kitchenView.ts` are both keyed by `StationType`, so `tsc` will fail until you give the new station behavior and a color.

Stations currently have no runtime state — `interactWithStation` just returns a description and `Cell.station` is a bare `StationType`. The marked EXTENSION POINTs (in `world.ts` `applyIntent`/`update`, and `types.ts` `Cell`) are where held items, cooking progress, and round timers will go.

### Notes

- `KayKit_Restaurant_Bits_1.0_FREE.zip` is an unextracted free 3D asset pack (not wired in); the boxes/capsule are placeholder geometry. The white floor-grid overlay in `kitchenView.ts` (`buildFloorGrid`) and the INTERACT `console.log` in `game.ts` are explicitly temporary.
- Three.js is r185 (`CapsuleGeometry` is available; some older-API assumptions in comments don't apply).
