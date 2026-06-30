import { Grid } from './grid';
import { Player } from './player';
import { interactWithStation, completeProcess } from './stations';
import { KITCHEN_LAYOUT, PLAYER_SPAWN } from './layout';
import type { Intent } from './intents';
import type { ActiveRecipe, Cell, GameState, GridPos, Recipe, StationType } from './types';

export interface InteractReport {
  pos: GridPos;
  target: StationType;
  message: string;
}

const MAX_RECIPES = 3;
const RECIPE_TIMEOUT = 180;
const INITIAL_RECIPES = 1;
const RECIPE_UNLOCK_INTERVAL = 20; // seconds between recipe unlocks

const RECIPES: Recipe[] = [
  { name: 'Hamburger', ingredients: ['bun', 'pattyCooked', 'lettuceSlice', 'cheeseSlice'], points: 400 },
  { name: 'Cheeseburger', ingredients: ['bun', 'pattyCooked', 'cheeseSlice'], points: 300 },
  { name: 'Simple Burger', ingredients: ['bun', 'pattyCooked'], points: 200 },
  { name: 'Veggie Plate', ingredients: ['lettuceSlice', 'cheeseSlice'], points: 100 },
];

function randomRecipe(): Recipe {
  return RECIPES[Math.floor(Math.random() * RECIPES.length)];
}

function newActiveRecipe(): ActiveRecipe {
  return { recipe: randomRecipe(), timeRemaining: RECIPE_TIMEOUT };
}

export class World {
  readonly grid: Grid;
  readonly player: Player;

  score = 0;
  activeRecipes: ActiveRecipe[] = [];
  private timeToNextRecipe = RECIPE_UNLOCK_INTERVAL;

  constructor() {
    this.grid = Grid.fromLayout(KITCHEN_LAYOUT);
    this.player = new Player(PLAYER_SPAWN);
    for (let i = 0; i < INITIAL_RECIPES; i++) {
      this.activeRecipes.push(newActiveRecipe());
    }
  }

  getState(): GameState {
    return {
      score: this.score,
      timeRemaining: 0,
      activeRecipes: this.activeRecipes,
      phase: 'playing',
    };
  }

  selectedCell(): Cell | null {
    const cell = this.player.interactTarget(this.grid);
    if (cell === undefined || cell.station === null) return null;
    return cell;
  }

  applyIntent(intent: Intent): InteractReport | null {
    if (intent === 'INTERACT') {
      const cell = this.selectedCell();
      if (cell === null || cell.station === null) return null;
      const result = interactWithStation(this.player, cell, this.activeRecipes);
      if (result === null) return null;

      if (result.deliveryComplete !== undefined) {
        const idx = result.deliveryComplete;
        this.score += this.activeRecipes[idx].recipe.points;
        this.activeRecipes[idx] = newActiveRecipe();
      }

      return { pos: cell.pos, target: cell.station, message: result.message };
    }

    this.player.applyIntent(intent, this.grid);
    return null;
  }

  update(dt: number): void {
    for (let i = 0; i < this.activeRecipes.length; i++) {
      this.activeRecipes[i].timeRemaining -= dt;
      if (this.activeRecipes[i].timeRemaining <= 0) {
        this.activeRecipes[i] = newActiveRecipe();
      }
    }

    if (this.activeRecipes.length < MAX_RECIPES) {
      this.timeToNextRecipe -= dt;
      if (this.timeToNextRecipe <= 0) {
        this.activeRecipes.push(newActiveRecipe());
        this.timeToNextRecipe = RECIPE_UNLOCK_INTERVAL;
      }
    }

    this.grid.forEach((cell) => {
      if (cell.process === null) return;
      cell.process.elapsed += dt;
      if (cell.process.elapsed >= cell.process.duration) completeProcess(cell);
    });
  }
}
