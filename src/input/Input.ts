export class Input {
  private readonly pressed = new Set<string>();
  private readonly justPressed = new Set<string>();
  private readonly element: HTMLElement;

  public pointerLocked = false;
  public mouseDX = 0;
  public mouseDY = 0;

  constructor(element: HTMLElement) {
    this.element = element;

    document.addEventListener('keydown', (e) => {
      if (!e.repeat) this.justPressed.add(e.code);
      this.pressed.add(e.code);
    });
    document.addEventListener('keyup', (e) => this.pressed.delete(e.code));

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.element;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
  }

  isDown(code: string) {
    return this.pressed.has(code);
  }

  consumePressed(code: string) {
    if (!this.justPressed.has(code)) return false;
    this.justPressed.delete(code);
    return true;
  }

  consumeMouseDelta() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { x: dx, y: dy };
  }

  async requestPointerLock() {
    if (this.pointerLocked) return;
    await this.element.requestPointerLock();
  }
}

