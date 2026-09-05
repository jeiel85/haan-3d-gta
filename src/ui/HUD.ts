import { Player } from '../entities/Player';
import { Vehicle } from '../entities/Vehicle';
import { Mission } from '../systems/MissionManager';

export class HUD {
  // Elements
  private starsContainer: HTMLElement;
  private cashDisplay: HTMLElement;
  private healthBar: HTMLElement;
  private armorBar: HTMLElement;
  private speedometerCard: HTMLElement;
  private speedValue: HTMLElement;
  private vehicleName: HTMLElement;
  private gearDisplay: HTMLElement;
  private missionBanner: HTMLElement;
  private missionTitle: HTMLElement;
  private missionDesc: HTMLElement;
  private missionTimer: HTMLElement;
  private radioBanner: HTMLElement;
  private timeDisplay: HTMLElement;
  private fpsDisplay: HTMLElement;
  private actionTip: HTMLElement;
  private gameOverOverlay: HTMLElement;
  private gameOverTitle: HTMLElement;
  private gameOverMsg: HTMLElement;
  private modalOverlay: HTMLElement;

  private radioTimeout: number | null = null;
  private frameCount = 0;
  private lastFpsTime = performance.now();

  constructor() {
    this.starsContainer = document.getElementById('wanted-stars')!;
    this.cashDisplay = document.getElementById('cash-display')!;
    this.healthBar = document.getElementById('health-bar')!;
    this.armorBar = document.getElementById('armor-bar')!;
    this.speedometerCard = document.getElementById('speedometer-card')!;
    this.speedValue = document.getElementById('speed-value')!;
    this.vehicleName = document.getElementById('vehicle-name')!;
    this.gearDisplay = document.getElementById('gear-display')!;
    this.missionBanner = document.getElementById('mission-banner')!;
    this.missionTitle = document.getElementById('mission-title')!;
    this.missionDesc = document.getElementById('mission-desc')!;
    this.missionTimer = document.getElementById('mission-timer')!;
    this.radioBanner = document.getElementById('radio-banner')!;
    this.timeDisplay = document.getElementById('time-display')!;
    this.fpsDisplay = document.getElementById('fps-display')!;
    this.actionTip = document.getElementById('action-tip')!;
    this.gameOverOverlay = document.getElementById('game-over-overlay')!;
    this.gameOverTitle = document.getElementById('game-over-title')!;
    this.gameOverMsg = document.getElementById('game-over-msg')!;
    this.modalOverlay = document.getElementById('modal-overlay')!;

    this.initHelpModal();
  }

  private initHelpModal() {
    const helpBtn = document.getElementById('help-btn');
    const closeBtn = document.getElementById('close-help-btn');

    helpBtn?.addEventListener('click', () => {
      this.modalOverlay.style.display = 'flex';
    });

    closeBtn?.addEventListener('click', () => {
      this.modalOverlay.style.display = 'none';
    });

    this.modalOverlay?.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.modalOverlay.style.display = 'none';
      }
    });
  }

  public toggleHelpModal() {
    const isVisible = this.modalOverlay.style.display === 'flex';
    this.modalOverlay.style.display = isVisible ? 'none' : 'flex';
  }

  public update(
    player: Player,
    wantedStars: number,
    drivingVehicle: Vehicle | null,
    mission: Mission | null,
    missionTime: number,
    timeLabel: string
  ) {
    // 1. Stats
    this.cashDisplay.textContent = `₩ ${player.cash.toLocaleString()}`;
    this.healthBar.style.width = `${Math.max(0, (player.health / player.maxHealth) * 100)}%`;
    this.armorBar.style.width = `${Math.max(0, (player.armor / player.maxArmor) * 100)}%`;

    // 2. Wanted Stars (1 to 5)
    const starElems = this.starsContainer.querySelectorAll('.star');
    starElems.forEach((el, idx) => {
      if (idx < wantedStars) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // 3. Driving Speedometer
    if (drivingVehicle) {
      this.speedometerCard.style.display = 'block';
      this.speedValue.textContent = `${Math.abs(Math.round(drivingVehicle.speedKmh))}`;
      this.vehicleName.textContent = drivingVehicle.config.name;
      this.gearDisplay.textContent = drivingVehicle.isReversing ? 'GEAR [R]' : 'GEAR [D]';
    } else {
      this.speedometerCard.style.display = 'none';
    }

    // 4. Mission Banner
    if (mission) {
      this.missionBanner.style.display = 'block';
      this.missionTitle.textContent = mission.title;
      this.missionDesc.textContent = mission.description;
      const mins = Math.floor(missionTime / 60);
      const secs = Math.floor(missionTime % 60);
      this.missionTimer.textContent = `⏱️ ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      this.missionBanner.style.display = 'none';
    }

    // 5. Time & FPS
    this.timeDisplay.textContent = timeLabel;
    this.updateFps();
  }

  private updateFps() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.fpsDisplay.textContent = `${fps} FPS`;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  public showRadioBanner(name: string) {
    this.radioBanner.textContent = name;
    this.radioBanner.style.opacity = '1';

    if (this.radioTimeout) clearTimeout(this.radioTimeout);
    this.radioTimeout = window.setTimeout(() => {
      this.radioBanner.style.opacity = '0';
    }, 3000);
  }

  public setTip(text: string) {
    this.actionTip.textContent = text;
  }

  public showGameOver(title: string, message: string, onDone: () => void) {
    this.gameOverTitle.textContent = title;
    this.gameOverMsg.textContent = message;
    this.gameOverOverlay.style.display = 'flex';

    setTimeout(() => {
      this.gameOverOverlay.style.display = 'none';
      onDone();
    }, 2800);
  }
}
