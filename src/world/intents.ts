/**
 * Intents: the abstract command vocabulary the world model accepts.
 *
 * This is the whole point of the input abstraction. The world knows ONLY about
 * these semantic commands — never about keys, mouse, or (later) EMG muscle
 * gestures. A KeyboardInput maps W -> 'MOVE_UP'; a future EmgInput maps a flex
 * gesture -> 'MOVE_UP'. Neither the world nor the renderer changes.
 *
 * Lives in the world layer (not input/) on purpose: data flows input -> world,
 * so the world owns its own input contract and input/ depends on world/, not
 * the other way around. (See note in chat.)
 *
 * Directions are SCREEN-relative ("up" = away from camera = north). The mapping
 * from screen-up to a grid direction is done in the world model (player.ts), so
 * if we ever rotate the camera we fix it in exactly one place.
 */
export type Intent =
  | 'MOVE_UP'
  | 'MOVE_DOWN'
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'INTERACT';
