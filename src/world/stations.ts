import type { Cell, FoodType, Item, ActiveRecipe } from './types';
import type { Player } from './player';

export interface InteractionResult {
  message: string;
  deliveryComplete?: number;
}

export const CHOP_DURATION = 1;
export const COOK_DURATION = 3;

const BARREL_FOOD: Record<string, FoodType> = {
  bunBarrel: 'bun',
  pattyBarrel: 'patty',
  lettuceBarrel: 'lettuce',
  cheeseBarrel: 'cheese',
};

function label(item: Item): string {
  if (item.kind === 'food') return item.food;
  return item.contents.length > 0 ? 'plate of food' : 'plate';
}

function isChoppable(food: FoodType): boolean {
  return food === 'carrot' || food === 'lettuce' || food === 'cheese';
}

function chopResult(food: FoodType): FoodType {
  if (food === 'carrot') return 'carrotPieces';
  if (food === 'lettuce') return 'lettuceSlice';
  if (food === 'cheese') return 'cheeseSlice';
  return food;
}

function isCookable(food: FoodType): boolean {
  return food === 'patty';
}

function cookResult(food: FoodType): FoodType {
  return food === 'patty' ? 'pattyCooked' : food;
}

function arraysMatch(a: FoodType[], b: FoodType[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}

export function completeProcess(cell: Cell): void {
  cell.process = null;
  if (cell.heldItem?.kind !== 'food') return;
  if (cell.station === 'cuttingBoard') {
    cell.heldItem = { kind: 'food', food: chopResult(cell.heldItem.food) };
  }
  if (cell.station === 'stove') {
    cell.heldItem = { kind: 'food', food: cookResult(cell.heldItem.food) };
  }
}

export function interactWithStation(
  player: Player,
  cell: Cell,
  activeRecipes: ActiveRecipe[],
): InteractionResult | null {
  switch (cell.station) {
    case 'barrel':
    case 'bunBarrel':
    case 'pattyBarrel':
    case 'lettuceBarrel':
    case 'cheeseBarrel': {
      if (player.heldItem !== null) return null;
      const food = BARREL_FOOD[cell.station];
      player.heldItem = { kind: 'food', food };
      return { message: `grabbed ${food} from ${cell.station}` };
    }

    case 'dishrack': {
      if (player.heldItem !== null) return null;
      player.heldItem = { kind: 'plate', contents: [] };
      return { message: 'grabbed a plate from the dish rack' };
    }

    case 'counter': {
      const held = player.heldItem;
      const onCounter = cell.heldItem;

      if (held?.kind === 'food' && onCounter?.kind === 'plate') {
        onCounter.contents.push(held.food);
        player.heldItem = null;
        return { message: `added ${held.food} to plate` };
      }
      if (held?.kind === 'plate' && onCounter?.kind === 'food') {
        cell.heldItem = { kind: 'plate', contents: [onCounter.food] };
        player.heldItem = null;
        return { message: `placed plate under ${onCounter.food}` };
      }
      if (held !== null && onCounter === null) {
        cell.heldItem = held;
        player.heldItem = null;
        return { message: `placed ${label(held)} on counter` };
      }
      if (held === null && onCounter !== null) {
        player.heldItem = onCounter;
        cell.heldItem = null;
        return { message: `picked up ${label(onCounter)} from counter` };
      }
      return null;
    }

    case 'cuttingBoard': {
      const held = player.heldItem;
      const onBoard = cell.heldItem;

      if (cell.process !== null) return null;

      if (onBoard === null && held?.kind === 'food') {
        cell.heldItem = held;
        player.heldItem = null;
        return { message: `placed ${held.food} on cutting board` };
      }
      if (held === null && onBoard?.kind === 'food' && isChoppable(onBoard.food)) {
        cell.process = { elapsed: 0, duration: CHOP_DURATION };
        return { message: `started chopping ${onBoard.food}` };
      }
      if (held === null && onBoard !== null) {
        player.heldItem = onBoard;
        cell.heldItem = null;
        return { message: `picked up ${label(onBoard)} from cutting board` };
      }
      return null;
    }

    case 'stove': {
      const held = player.heldItem;
      const onStove = cell.heldItem;

      if (cell.process !== null) return null;

      if (onStove === null && held?.kind === 'food' && isCookable(held.food)) {
        cell.heldItem = held;
        cell.process = { elapsed: 0, duration: COOK_DURATION };
        player.heldItem = null;
        return { message: `started cooking ${held.food}` };
      }
      if (held === null && onStove !== null) {
        player.heldItem = onStove;
        cell.heldItem = null;
        return { message: `picked up ${label(onStove)} from stove` };
      }
      return null;
    }

    case 'delivery': {
      const held = player.heldItem;
      if (held?.kind !== 'plate' || held.contents.length === 0) return null;

      for (let i = 0; i < activeRecipes.length; i++) {
        const ar = activeRecipes[i];
        if (arraysMatch(held.contents, ar.recipe.ingredients)) {
          player.heldItem = null;
          return {
            message: `Delivered ${ar.recipe.name}! +${ar.recipe.points} pts`,
            deliveryComplete: i,
          };
        }
      }

      return { message: 'Wrong ingredients! Throw it in the trash.' };
    }

    case 'trash': {
      if (player.heldItem === null) return null;
      const name = label(player.heldItem);
      player.heldItem = null;
      return { message: `discarded ${name} in trash` };
    }

    case null:
      return null;
  }
}
