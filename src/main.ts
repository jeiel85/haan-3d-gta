import * as THREE from 'three';
import { CityMap } from './world/CityMap';
import { Environment } from './world/Environment';
import { Player } from './entities/Player';
import { Vehicle } from './entities/Vehicle';
import { Pedestrian } from './entities/Pedestrian';
import { TrafficManager } from './entities/TrafficManager';
import { WantedSystem } from './systems/WantedSystem';
import { MissionManager } from './systems/MissionManager';
import { Physics } from './systems/Physics';
import { InputController } from './systems/InputController';
import { soundManager } from './systems/SoundSystem';
import { Minimap } from './ui/Minimap';
import { HUD } from './ui/HUD';

export type CameraViewMode = 'TPS_CLOSE' | 'TPS_FAR' | 'TOP_DOWN' | 'HOOD_FIRST';

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Systems & Managers
  private cityMap: CityMap;
  private environment: Environment;
  private player: Player;
  private vehicles: Vehicle[] = [];
  private pedestrians: Pedestrian[] = [];
  private trafficManager: TrafficManager;
  private wantedSystem: WantedSystem;
  private missionManager: MissionManager;
  private physics: Physics;
  private input: InputController;
  private minimap: Minimap;
  private hud: HUD;

  // Camera State
  private cameraMode: CameraViewMode = 'TPS_CLOSE';
  private cameraYaw = 0;
  private cameraPitch = 0.25;
  private cameraCurrentPos = new THREE.Vector3(0, 5, -10);

  // Timing
  private clock = new THREE.Clock();
  private isRunning = false;
  private isGameOver = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    // 1. Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 500);

    // 3. World & Environment
    this.cityMap = new CityMap(this.scene);
    this.environment = new Environment(this.scene);
    this.physics = new Physics(this.cityMap);

    // 4. Player & Vehicles
    // Spawn player in front of KB Bank / Haan Sageori crosswalk
    this.player = new Player(new THREE.Vector3(18, 0, 18));
    this.scene.add(this.player.mesh);

    // Spawn 4 Player-driveable parked vehicles at various corners of Haan Sageori
    this.spawnDriveableVehicles();

    // 5. Pedestrians
    this.spawnPedestrians();

    // 6. Traffic, Wanted, Missions & UI
    this.trafficManager = new TrafficManager(this.scene, this.cityMap);
    this.wantedSystem = new WantedSystem(this.scene);
    this.missionManager = new MissionManager(this.scene);
    this.input = new InputController();
    this.minimap = new Minimap('minimap-canvas', this.cityMap);
    this.hud = new HUD();

    this.initEventListeners();
  }

  private spawnDriveableVehicles() {
    const parked = [
      // 1. Blue Sonata Sedan parked near KB Bank
      { type: 'SEDAN' as const, pos: new THREE.Vector3(18, 0, 8), heading: Math.PI / 2, color: 0x0984e3 },
      // 2. Red Sports GT Supercar parked near Olive Young
      { type: 'SPORTS' as const, pos: new THREE.Vector3(-18, 0, 12), heading: -Math.PI / 2, color: 0xd63031 },
      // 3. Mint Delivery Scooter near Mega Coffee
      { type: 'SCOOTER' as const, pos: new THREE.Vector3(22, 0, -20), heading: 0, color: 0x2bcbba },
      // 4. Green Gwangmyeong Maeul Bus parked at bus shelter
      { type: 'BUS' as const, pos: new THREE.Vector3(15.2, 0, 28), heading: Math.PI, color: 0x00b894 },
      // 5. Police Patrol car near Woori Bank
      { type: 'POLICE' as const, pos: new THREE.Vector3(-18, 0, -15), heading: Math.PI / 2, color: 0xffffff }
    ];

    parked.forEach(cfg => {
      const v = new Vehicle(cfg.type, cfg.pos, cfg.heading, cfg.color);
      this.scene.add(v.mesh);
      this.vehicles.push(v);
    });
  }

  private spawnPedestrians() {
    const waypoints = [
      { start: new THREE.Vector3(16, 0, 25), target: new THREE.Vector3(16, 0, 80) },
      { start: new THREE.Vector3(-16, 0, 30), target: new THREE.Vector3(-16, 0, 90) },
      { start: new THREE.Vector3(20, 0, -25), target: new THREE.Vector3(20, 0, -85) },
      { start: new THREE.Vector3(-20, 0, -30), target: new THREE.Vector3(-20, 0, -95) },
      { start: new THREE.Vector3(35, 0, 16), target: new THREE.Vector3(90, 0, 16) },
      { start: new THREE.Vector3(-35, 0, 16), target: new THREE.Vector3(-90, 0, 16) },
      { start: new THREE.Vector3(35, 0, -16), target: new THREE.Vector3(90, 0, -16) },
      { start: new THREE.Vector3(-35, 0, -16), target: new THREE.Vector3(-90, 0, -16) }
    ];

    waypoints.forEach(wp => {
      const ped = new Pedestrian(wp.start, wp.target);
      this.scene.add(ped.mesh);
      this.pedestrians.push(ped);
    });
  }

  private initEventListeners() {
    // Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start Screen Button
    const startBtn = document.getElementById('start-btn');
    const splash = document.getElementById('splash-screen');
    startBtn?.addEventListener('click', () => {
      soundManager.init();
      soundManager.resume();
      if (splash) splash.style.display = 'none';
      this.isRunning = true;
      this.clock.start();
      this.animate();
    });
  }

  public animate = () => {
    requestAnimationFrame(this.animate);
    if (!this.isRunning) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.handleInputs();
    this.updateGame(delta);
    this.updateCamera(delta);

    this.renderer.render(this.scene, this.camera);
  };

  private handleInputs() {
    // 1. Vehicle Entry / Exit (F key or Enter)
    if (this.input.enterVehicleTrigger) {
      if (this.player.isDriving) {
        this.player.exitVehicle();
        this.hud.setTip('💡 차량에서 하차했습니다.');
      } else {
        const allVehicles = [...this.vehicles, ...this.trafficManager.vehicles, ...this.wantedSystem.policeCars];
        const nearest = this.player.findNearestVehicle(allVehicles);
        if (nearest) {
          this.player.enterVehicle(nearest);
          this.hud.setTip(`🚗 [${nearest.config.name}]에 탑승했습니다! (W: 가속, Space: 드리프트)`);
          if (nearest.type === 'POLICE') {
            this.wantedSystem.addCrime(1); // stealing police car adds wanted star!
          }
        }
      }
    }

    // 2. Punch / Attack (E or Left Mouse Click)
    if (this.input.punchTrigger && !this.player.isDriving) {
      const punched = this.player.punch();
      if (punched) {
        // Check if hit nearby pedestrian
        this.pedestrians.forEach(ped => {
          if (ped.state !== 'DOWN' && this.player.position.distanceTo(ped.position) < 1.8) {
            const punchImpulse = new THREE.Vector3(Math.sin(this.player.heading), 0, Math.cos(this.player.heading)).multiplyScalar(10);
            ped.hit(punchImpulse);
            this.wantedSystem.addCrime(1);
          }
        });
      }
    }

    // 3. Horn & Siren (H key)
    if (this.input.hornTrigger) {
      if (this.player.isDriving && this.player.currentVehicle) {
        soundManager.playHorn();
        // Scare nearby pedestrians
        this.pedestrians.forEach(ped => {
          if (ped.position.distanceTo(this.player.currentVehicle!.position) < 14) {
            ped.triggerPanic(this.player.currentVehicle!.position);
          }
        });
      }
    }

    // 4. Camera View Toggle (C key)
    if (this.input.cameraViewTrigger) {
      const views: CameraViewMode[] = ['TPS_CLOSE', 'TPS_FAR', 'TOP_DOWN', 'HOOD_FIRST'];
      const nextIdx = (views.indexOf(this.cameraMode) + 1) % views.length;
      this.cameraMode = views[nextIdx];
      this.hud.setTip(`📷 카메라 시점: [${this.cameraMode}]`);
    }

    // 5. Time & Weather Toggle (T key)
    if (this.input.timeWeatherTrigger) {
      const newMode = this.environment.cycleMode();
      this.hud.setTip(`🌤️ 날씨/시간대 변경: [${newMode}]`);
    }

    // 6. Radio Station Change (R key)
    if (this.input.radioTrigger) {
      const stationName = soundManager.cycleRadioStation();
      this.hud.showRadioBanner(stationName);
    }

    // 7. Mission Start / Accept (M key)
    if (this.input.missionTrigger) {
      if (!this.missionManager.isMissionActive) {
        const m = this.missionManager.startNextMission();
        this.hud.setTip(`🎯 [${m.title}] 수락! 목적지 비콘으로 이동하세요!`);
      } else {
        this.missionManager.cancelMission();
        this.hud.setTip('❌ 진행 중이던 미션을 취소했습니다.');
      }
    }

    // Mouse camera rotation
    if (this.input.mouseDeltaX !== 0 || this.input.mouseDeltaY !== 0) {
      this.cameraYaw -= this.input.mouseDeltaX * 0.0035;
      this.cameraPitch = Math.max(0.05, Math.min(Math.PI / 2.2, this.cameraPitch - this.input.mouseDeltaY * 0.0035));
    }

    this.input.consumeTriggers();
  }

  private updateGame(delta: number) {
    if (this.isGameOver) return;

    const allVehicles = [...this.vehicles, ...this.trafficManager.vehicles, ...this.wantedSystem.policeCars];

    // 1. Update Player (Driving vs Foot)
    if (this.player.isDriving && this.player.currentVehicle) {
      const v = this.player.currentVehicle;
      const throttle = this.input.forward ? 1 : (this.input.backward ? -1 : 0);
      const steer = this.input.left ? -1 : (this.input.right ? 1 : 0);

      v.updatePhysics(delta, throttle, steer, this.input.jumpOrHandbrake);
      this.player.position.copy(v.position);

      // Collisions for player vehicle
      this.physics.updateVehicleCollisions(
        v,
        allVehicles,
        (ped) => {
          this.wantedSystem.addCrime(1);
        },
        () => {
          this.wantedSystem.addCrime(2);
        }
      );

      this.physics.checkVehiclePedestrianCollisions(v, this.pedestrians, () => {
        this.wantedSystem.addCrime(1);
      });
    } else {
      // Foot movement
      const moveX = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
      const moveZ = (this.input.backward ? 1 : 0) - (this.input.forward ? 1 : 0);

      this.player.updateOnFoot(delta, moveX, moveZ, this.input.sprint, this.input.jumpOrHandbrake, this.cameraYaw);
      this.physics.updatePlayerCollisions(this.player);

      // Tip for nearby cars
      const nearest = this.player.findNearestVehicle(allVehicles);
      if (nearest && this.player.position.distanceTo(nearest.position) < 3.5) {
        this.hud.setTip(`💡 [F] 키를 눌러 [${nearest.config.name}]에 탑승하세요.`);
      }
    }

    // 2. City Map & Environment
    this.cityMap.update(delta);
    this.environment.update(delta, this.player.position);

    // 3. Pedestrians
    const drivingV = this.player.isDriving ? this.player.currentVehicle : null;
    this.pedestrians.forEach(ped => {
      ped.update(delta, this.player.position, !!drivingV, drivingV?.position);
    });

    // 4. Traffic Manager (Ambient Cars)
    this.trafficManager.update(delta, drivingV, this.player.position);

    // 5. Wanted System & Police Pursuits
    const playerSpeed = drivingV ? drivingV.speedKmh : this.player.velocity.length() * 3.6;
    const wantedRes = this.wantedSystem.update(delta, this.player.position, playerSpeed);

    if (wantedRes.isBusted && !this.isGameOver) {
      this.triggerBusted();
    }

    // Check Player Health
    if (this.player.health <= 0 && !this.isGameOver) {
      this.triggerWasted();
    }

    // 6. Mission Manager
    const missionRes = this.missionManager.update(delta, this.player.position);
    if (missionRes.completed) {
      this.player.addCash(missionRes.reward);
      this.hud.setTip(missionRes.message);
    } else if (missionRes.failed) {
      this.hud.setTip(missionRes.message);
    } else if (missionRes.message) {
      this.hud.setTip(missionRes.message);
    }

    // 7. Update HUD & Minimap
    const timeLabels = {
      DAY: '☀️ 낮 (14:30)',
      SUNSET: '🌇 노을 (18:45)',
      NIGHT: '🌃 네온 나이트 (22:15)',
      RAIN: '🌧️ 하안 비 (19:20)'
    };
    this.hud.update(
      this.player,
      this.wantedSystem.stars,
      drivingV,
      this.missionManager.currentMission,
      this.missionManager.remainingTime,
      timeLabels[this.environment.currentMode]
    );

    this.minimap.render(
      this.player.position,
      this.player.isDriving && drivingV ? drivingV.heading : this.cameraYaw,
      allVehicles,
      this.wantedSystem.policeCars,
      this.missionManager.getObjectiveMarkerPos()
    );
  }

  private updateCamera(delta: number) {
    const target = this.player.isDriving && this.player.currentVehicle
      ? this.player.currentVehicle.position
      : this.player.position;

    let targetCamPos = new THREE.Vector3();
    let lookTarget = target.clone().add(new THREE.Vector3(0, 1.4, 0));

    switch (this.cameraMode) {
      case 'TPS_CLOSE': {
        const dist = 5.2;
        const height = 2.4;
        const offset = new THREE.Vector3(
          Math.sin(this.cameraYaw) * dist * Math.cos(this.cameraPitch),
          Math.sin(this.cameraPitch) * dist + height,
          Math.cos(this.cameraYaw) * dist * Math.cos(this.cameraPitch)
        );
        targetCamPos = target.clone().add(offset);
        break;
      }

      case 'TPS_FAR': {
        const dist = 9.5;
        const height = 4.2;
        const offset = new THREE.Vector3(
          Math.sin(this.cameraYaw) * dist * Math.cos(this.cameraPitch),
          Math.sin(this.cameraPitch) * dist + height,
          Math.cos(this.cameraYaw) * dist * Math.cos(this.cameraPitch)
        );
        targetCamPos = target.clone().add(offset);
        break;
      }

      case 'TOP_DOWN': {
        targetCamPos = target.clone().add(new THREE.Vector3(0, 45, 0.1));
        lookTarget = target.clone();
        break;
      }

      case 'HOOD_FIRST': {
        if (this.player.isDriving && this.player.currentVehicle) {
          const v = this.player.currentVehicle;
          const forward = new THREE.Vector3(Math.sin(v.heading), 0, Math.cos(v.heading));
          targetCamPos = v.position.clone().add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(forward, 0.8);
          lookTarget = targetCamPos.clone().addScaledVector(forward, 25);
        } else {
          targetCamPos = target.clone().add(new THREE.Vector3(0, 1.6, 0));
        }
        break;
      }
    }

    // Smooth camera damping
    this.cameraCurrentPos.lerp(targetCamPos, delta * 12);
    this.camera.position.copy(this.cameraCurrentPos);
    this.camera.lookAt(lookTarget);
  }

  private triggerWasted() {
    this.isGameOver = true;
    this.hud.showGameOver('WASTED', '하안 응급실로 후송되었습니다 (-₩50,000)', () => {
      this.respawnPlayer();
    });
  }

  private triggerBusted() {
    this.isGameOver = true;
    this.hud.showGameOver('BUSTED', '광명경찰서 하안지구대에 체포되었습니다 (-₩70,000)', () => {
      this.respawnPlayer();
    });
  }

  private respawnPlayer() {
    this.wantedSystem.clearWanted();
    this.missionManager.cancelMission();
    this.player.respawn(new THREE.Vector3(18, 0, 18));
    this.isGameOver = false;
    this.hud.setTip('🏥 하안사거리에서 치료를 마치고 복귀했습니다.');
  }
}

// Instantiate Game on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
