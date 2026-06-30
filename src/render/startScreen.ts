export class StartScreen {
  private root: HTMLDivElement;
  private onStart: () => void;
  private started = false;

  constructor(container: HTMLElement, onStart: () => void) {
    this.onStart = onStart;

    this.root = document.createElement('div');
    this.root.id = 'start-screen';

    this.root.innerHTML = `
      <div class="start-bg">
        <div class="beach-sky"></div>
        <div class="beach-sun"></div>
        <div class="beach-clouds"></div>
        <div class="beach-ocean"></div>
        <div class="beach-wave"></div>
        <div class="beach-sand"></div>
        <div class="beach-cooking">
          <div class="chef chef-left">
            <div class="chef-panda">🐼</div>
            <div class="apron apron-red"></div>
          </div>
          <div class="cooking-counter">
            <div class="counter-top"></div>
            <div class="counter-leg left"></div>
            <div class="counter-leg right"></div>
            <div class="counter-food">🍔</div>
          </div>
          <div class="chef chef-right">
            <div class="chef-panda">🐼</div>
            <div class="apron apron-blue"></div>
          </div>
        </div>
      </div>
      <div class="start-overlay"></div>
      <div class="start-controls">
        <div class="keyboard-row">
          <div class="key-row"><kbd>W</kbd></div>
          <div class="key-row"><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>
        </div>
        <div class="key-hint">move</div>
        <div class="space-row"><kbd>SPACE</kbd> <span class="space-label">interact</span></div>
      </div>

      <div class="start-content">
        <h1 class="start-title">PANDA<br>COOKING</h1>
        <p class="start-subtitle">A chaotic kitchen adventure!</p>
      </div>

      <p class="start-prompt">click anywhere to start</p>
    `;

    const startAction = () => {
      if (this.started) return;
      this.started = true;
      this.hide();
      this.onStart();
    };

    this.root.addEventListener('click', startAction);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.started) {
        e.preventDefault();
        startAction();
      }
    }, { once: true });

    container.appendChild(this.root);
  }

  hide(): void {
    this.root.classList.add('start-hidden');
    setTimeout(() => this.root.remove(), 500);
  }
}
