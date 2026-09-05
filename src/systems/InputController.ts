export class InputController {
  // Movement keys
  public forward = false;
  public backward = false;
  public left = false;
  public right = false;
  public sprint = false;
  public jumpOrHandbrake = false;

  // Action Triggers (single-press flags)
  public enterVehicleTrigger = false;
  public punchTrigger = false;
  public hornTrigger = false;
  public lightsTrigger = false;
  public cameraViewTrigger = false;
  public timeWeatherTrigger = false;
  public radioTrigger = false;
  public missionTrigger = false;

  // Mouse camera rotation
  public mouseDeltaX = 0;
  public mouseDeltaY = 0;
  public isMouseDown = false;

  constructor() {
    this.initKeyboard();
    this.initMouse();
    this.initTouch();
  }

  private initKeyboard() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Don't capture keys if an input modal or prompt is active
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.sprint = true;
          break;
        case 'Space':
          this.jumpOrHandbrake = true;
          e.preventDefault();
          break;

        // Triggers
        case 'KeyF':
        case 'Enter':
          this.enterVehicleTrigger = true;
          break;
        case 'KeyE':
          this.punchTrigger = true;
          break;
        case 'KeyH':
          this.hornTrigger = true;
          break;
        case 'KeyL':
          this.lightsTrigger = true;
          break;
        case 'KeyC':
          this.cameraViewTrigger = true;
          break;
        case 'KeyT':
          this.timeWeatherTrigger = true;
          break;
        case 'KeyR':
          this.radioTrigger = true;
          break;
        case 'KeyM':
          this.missionTrigger = true;
          break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.sprint = false;
          break;
        case 'Space':
          this.jumpOrHandbrake = false;
          break;
      }
    });
  }

  private initMouse() {
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        // Also trigger punch if clicking on the main canvas
        if (e.target && (e.target as HTMLElement).id === 'game-canvas') {
          this.punchTrigger = true;
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });
  }

  private initTouch() {
    const bindTouch = (elemId: string, onDown: () => void, onUp?: () => void) => {
      const el = document.getElementById(elemId);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        onDown();
      }, { passive: false });
      if (onUp) {
        el.addEventListener('touchend', (e) => {
          e.preventDefault();
          onUp();
        }, { passive: false });
      }
    };

    bindTouch('btn-touch-f', () => { this.enterVehicleTrigger = true; });
    bindTouch('btn-touch-punch', () => { this.punchTrigger = true; });
    bindTouch('btn-touch-jump', () => { this.jumpOrHandbrake = true; }, () => { this.jumpOrHandbrake = false; });
    bindTouch('btn-touch-gas', () => { this.forward = true; }, () => { this.forward = false; });
    bindTouch('btn-touch-brake', () => { this.backward = true; }, () => { this.backward = false; });
    bindTouch('btn-touch-horn', () => { this.hornTrigger = true; });
  }

  public consumeTriggers() {
    this.enterVehicleTrigger = false;
    this.punchTrigger = false;
    this.hornTrigger = false;
    this.lightsTrigger = false;
    this.cameraViewTrigger = false;
    this.timeWeatherTrigger = false;
    this.radioTrigger = false;
    this.missionTrigger = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }
}
