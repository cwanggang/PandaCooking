/**
 * Per-station interaction logic — the home for "what happens when you INTERACT
 * with this kind of station". Pure logic, no rendering, no I/O.
 *
 * RIGHT NOW every station just returns a short description string; nothing
 * changes state yet (no held items, no cooking). This `switch` is the extension
 * point: when you build a real station, replace its case with actual behavior
 * (e.g. the 'stove' case starts/stops cooking the held ingredient).
 *
 * The switch is EXHAUSTIVE on purpose: there is no `default`, and the function
 * promises to return a string, so if you add a new StationType in types.ts and
 * forget to handle it here, TypeScript reports an error instead of silently
 * doing nothing. That's the safety net the type system buys us.
 */

import type { StationType } from './types';

export function interactWithStation(station: StationType): string {
  switch (station) {
    case 'counter':
      return 'counter — place or pick up an item here';
    case 'barrel':
      return 'barrel — grab a raw ingredient';
    case 'stove':
      return 'stove — start/stop cooking';
    case 'cuttingBoard':
      return 'cutting board — chop the held ingredient';
    case 'plate':
      return 'plate dispenser — take a clean plate';
    case 'delivery':
      return 'delivery — hand in the finished dish';
    case 'trash':
      return 'trash — discard the held item';
  }
}
