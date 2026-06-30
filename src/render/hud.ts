import type { GameState, ActiveRecipe } from '../world/types';

const NOTIFICATION_DURATION = 2500;

export class HUD {
  private root: HTMLDivElement;
  private timerEl: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private recipeCards: HTMLDivElement[] = [];
  private notificationEl: HTMLDivElement;
  private notificationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';

    // Game timer (top-center)
    const timerWrap = document.createElement('div');
    timerWrap.className = 'hud-timer-wrap';
    this.timerEl = document.createElement('div');
    this.timerEl.className = 'hud-timer';
    timerWrap.appendChild(this.timerEl);
    this.root.appendChild(timerWrap);

    // Score (top-right)
    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'hud-score';
    this.root.appendChild(this.scoreEl);

    // Recipe cards (right side)
    const recipesCol = document.createElement('div');
    recipesCol.className = 'hud-recipes-col';

    for (let i = 0; i < 3; i++) {
      const card = document.createElement('div');
      card.className = 'hud-recipe-card';
      card.innerHTML = `
        <div class="hud-recipe-timer"></div>
        <div class="hud-recipe-name"></div>
        <div class="hud-ingredients"></div>
      `;
      recipesCol.appendChild(card);
      this.recipeCards.push(card);
    }

    this.root.appendChild(recipesCol);

    // Toast notification
    this.notificationEl = document.createElement('div');
    this.notificationEl.className = 'hud-notification';
    this.notificationEl.style.opacity = '0';
    this.root.appendChild(this.notificationEl);

    container.appendChild(this.root);
  }

  showMessage(text: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.notificationEl.textContent = text;
    this.notificationEl.className = `hud-notification ${type}`;
    this.notificationEl.style.opacity = '1';
    this.notificationTimer = setTimeout(() => {
      this.notificationEl.style.opacity = '0';
    }, NOTIFICATION_DURATION);
  }

  private foodLabel(food: string): string {
    const labels: Record<string, string> = {
      bun: 'Bun',
      patty: 'Raw Patty',
      pattyCooked: 'Cooked Patty',
      lettuce: 'Lettuce',
      lettuceSlice: 'Lettuce Slice',
      cheese: 'Cheese',
      cheeseSlice: 'Cheese Slice',
      carrot: 'Carrot',
      carrotPieces: 'Carrot Pieces',
    };
    return labels[food] ?? food;
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.floor(Math.max(0, seconds) % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  sync(state: GameState): void {
    // Game timer
    this.timerEl.textContent = this.formatTime(state.timeRemaining);
    this.timerEl.classList.toggle('hud-timer-warning', state.timeRemaining <= 30);

    // Score
    this.scoreEl.textContent = `${state.score}`;

    // Recipe cards
    for (let i = 0; i < 3; i++) {
      const card = this.recipeCards[i];
      const ar: ActiveRecipe | undefined = state.activeRecipes[i];

      if (!ar) {
        card.style.display = 'none';
        continue;
      }
      card.style.display = '';

      const timerEl = card.querySelector('.hud-recipe-timer')!;
      const nameEl = card.querySelector('.hud-recipe-name')!;
      const ingEl = card.querySelector('.hud-ingredients')!;

      timerEl.textContent = this.formatTime(ar.timeRemaining);
      timerEl.classList.toggle('hud-timer-warning', ar.timeRemaining <= 10);

      nameEl.textContent = ar.recipe.name;
      ingEl.textContent = ar.recipe.ingredients
        .map((f) => this.foodLabel(f))
        .join(' + ');
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
