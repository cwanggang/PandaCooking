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
        <div class="cloud cloud-1"><div class="cloud-body"></div></div>
        <div class="cloud cloud-2"><div class="cloud-body"></div></div>
        <div class="cloud cloud-3"><div class="cloud-body"></div></div>
        <div class="cloud cloud-4"><div class="cloud-body"></div></div>
        <div class="cloud cloud-5"><div class="cloud-body"></div></div>
        <div class="cloud cloud-6"><div class="cloud-body"></div></div>
        <div class="beach-ocean"></div>
        <div class="beach-wave"></div>
        <div class="beach-wet-sand"></div>
        <div class="beach-sand"></div>
        <div class="shell shell-1"></div>
        <div class="shell shell-2"></div>
        <div class="shell shell-3"></div>
        <div class="shell shell-4"></div>
        <div class="shell shell-5"></div>
        <div class="shell-frag" style="bottom:30%;left:8%;"></div>
        <div class="shell-frag" style="bottom:20%;left:16%;"></div>
        <div class="shell-frag" style="bottom:26%;left:35%;"></div>
        <div class="shell-frag" style="bottom:16%;left:48%;"></div>
        <div class="shell-frag" style="bottom:33%;left:62%;"></div>
        <div class="shell-frag" style="bottom:21%;left:75%;"></div>
        <div class="shell-frag" style="bottom:28%;left:88%;"></div>
        <div class="shell-frag" style="bottom:14%;left:92%;"></div>
        <div class="beach-cooking">
          <div class="cooking-station">
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
          </div>
          <div class="cooking-station">
            <div class="cooking-counter">
              <div class="counter-top"></div>
              <div class="counter-leg left"></div>
              <div class="counter-leg right"></div>
              <div class="counter-food">🥘</div>
            </div>
            <div class="chef chef-right">
              <div class="chef-panda">🐼</div>
              <div class="apron apron-blue"></div>
            </div>
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
