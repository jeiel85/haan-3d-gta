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

  // Camera State (Unified FPS / TPS forward orientation)
  private cameraMode: CameraViewMode = 'TPS_CLOSE';
  private cameraYaw = 0;
  private cameraPitch = 0.15; // vertical look angle
  private cameraCurrentPos = new THREE.Vector3(0, 5, -10);
  private cameraCurrentLook = new THREE.Vector3(0, 1.4, 0);
  private mouseActiveTimer = 0;

  // Timing & Game state
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
    // Spawn player on the sidewalk in front of the Haan Bus Stop / KB Bank plaza
    this.player = new Player(new THREE.Vector3(14.5, 0, 20));
    this.scene.add(this.player.mesh);

    // Spawn 5 Player-driveable parked vehicles on the road curb lanes
    this.spawnDriveableVehicles();

    // 5. Pedestrians
    this.spawnPedestrians();

    // 6. Traffic, Wanted, Missions, Input & UI
    this.trafficManager = new TrafficManager(this.scene, this.cityMap);
    this.wantedSystem = new WantedSystem(this.scene);
    this.missionManager = new MissionManager(this.scene);
    this.input = new InputController(this.canvas);
    this.minimap = new Minimap('minimap-canvas', this.cityMap);
    this.hud = new HUD();

    this.initEventListeners();
  }

  private spawnDriveableVehicles() {
    // Road width is 26m (-13m to +13m). Curb lanes are at |coord| = 10.8m.
    const parked = [
      // 1. Blue Sonata Sedan parked along Haan-ro road curb
      { type: 'SEDAN' as const, pos: new THREE.Vector3(26, 0, 10.8), heading: Math.PI / 2, color: 0x0984e3 },
      // 2. Red Sports GT Supercar parked along Haan-ro road curb
      { type: 'SPORTS' as const, pos: new THREE.Vector3(-26, 0, -10.8), heading: -Math.PI / 2, color: 0xd63031 },
      // 3. Mint Delivery Scooter parked at road curb near Mega Coffee
      { type: 'SCOOTER' as const, pos: new THREE.Vector3(10.8, 0, -20), heading: Math.PI, color: 0x2bcbba },
      // 4. Green Gwangmyeong Maeul Bus parked at bus stop bay on road (in front of bus shelter at x=15.2)
      { type: 'BUS' as const, pos: new THREE.Vector3(10.8, 0, 28), heading: Math.PI, color: 0x00b894 },
      // 5. Police Patrol car parked at road curb near Woori Bank
      { type: 'POLICE' as const, pos: new THREE.Vector3(-10.8, 0, -25), heading: 0, color: 0xffffff }
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

      // Lock mouse cursor immediately on game start for seamless FPS feel
      this.input.requestPointerLock();

      this.animate();
    });

    // Help Modal Pointer Lock handling
    const helpBtn = document.getElementById('help-btn');
    const closeHelpBtn = document.getElementById('close-help-btn');
    const modalOverlay = document.getElementById('modal-overlay');

    helpBtn?.addEventListener('click', () => {
      this.input.exitPointerLock();
    });

    closeHelpBtn?.addEventListener('click', () => {
      if (this.isRunning) {
        this.input.requestPointerLock();
      }
    });

    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay && this.isRunning) {
        this.input.requestPointerLock();
      }
    });
  }

  public animate = () => {
    requestAnimationFrame(this.animate);
    if (!this.isRunning) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.handleInputs(delta);
    this.updateGame(delta);
    this.updateCamera(delta);

    this.renderer.render(this.scene, this.camera);
  };

  private handleInputs(delta: number) {
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
            this.wantedSystem.addCrime(1); // stealing police car adds wanted star
          }
        }
      }
    }

    // 2. Punch / Attack (E or Left Mouse Click in pointer lock)
    if (this.input.punchTrigger && !this.player.isDriving) {
      const punched = this.player.punch();
      if (punched) {
        // Check if hit nearby pedestrian
        this.pedestrians.forEach(ped => {
          if (ped.state !== 'DOWN' && this.player.position.distanceTo(ped.position) < 2.0) {
            const punchImpulse = new THREE.Vector3(Math.sin(this.player.heading), 0, Math.cos(this.player.heading)).multiplyScalar(10);
            ped.hit(punchImpulse);
            this.wantedSystem.addCrime(1);
          }
        });
      }
    }

    // 3. Horn & Siren (H key or Right Mouse Click)
    if (this.input.hornTrigger) {
      if (this.player.isDriving && this.player.currentVehicle) {
        soundManager.playHorn();
        // Scare nearby pedestrians
        this.pedestrians.forEach(ped => {
          if (ped.position.distanceTo(this.player.currentVehicle!.position) < 15) {
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
      const viewNames = {
        TPS_CLOSE: '3인칭 근접',
        TPS_FAR: '3인칭 원거리',
        TOP_DOWN: '클래식 탑다운',
        HOOD_FIRST: '1인칭 FPS 뷰'
      };
      this.hud.setTip(`📷 카메라 시점: [${viewNames[this.cameraMode]}]`);
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

    // 8. FPS Mouse Look (Mouse moves freely rotate camera)
    const sensitivity = 0.0022;
    if (this.input.mouseDeltaX !== 0 || this.input.mouseDeltaY !== 0) {
      this.cameraYaw -= this.input.mouseDeltaX * sensitivity;
      // Moving mouse UP looks UP (increases pitch), moving mouse DOWN looks DOWN
      this.cameraPitch -= this.input.mouseDeltaY * sensitivity;
      this.cameraPitch = Math.max(-0.65, Math.min(1.2, this.cameraPitch));
      this.mouseActiveTimer = 1.6; // active manual look timer
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
        () => {
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
      if (nearest && this.player.position.distanceTo(nearest.position) < 3.8) {
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
    const isDriving = this.player.isDriving && this.player.currentVehicle !== null;
    const vehicle = this.player.currentVehicle;

    // Driving camera auto-alignment: when moving forward without mouse movement, align camera behind vehicle
    if (isDriving && vehicle) {
      if (this.mouseActiveTimer > 0) {
        this.mouseActiveTimer -= delta;
      } else if (Math.abs(vehicle.speedKmh) > 4) {
        const targetHeading = vehicle.speedKmh > 0 ? vehicle.heading : vehicle.heading + Math.PI;
        let diff = targetHeading - this.cameraYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.cameraYaw += diff * Math.min(1, delta * 3.5);
        this.cameraPitch = THREE.MathUtils.lerp(this.cameraPitch, 0.22, delta * 3.0);
      }
    }

    const targetPos = isDriving && vehicle ? vehicle.position : this.player.position;
    const focusHeight = isDriving ? 1.1 : 1.45;
    const focusPoint = targetPos.clone().add(new THREE.Vector3(0, focusHeight, 0));

    // Forward direction vector according to current yaw & pitch
    const forward = new THREE.Vector3(
      -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
      Math.sin(this.cameraPitch),
      -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
    );

    let targetCamPos = new THREE.Vector3();
    let lookTarget = new THREE.Vector3();

    switch (this.cameraMode) {
      case 'TPS_CLOSE': {
        const dist = isDriving ? 6.2 : 4.6;
        // Camera placed behind focusPoint along -forward
        targetCamPos = focusPoint.clone().sub(forward.clone().multiplyScalar(dist));
        // Over-the-shoulder right offset when on foot
        if (!isDriving) {
          const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
          targetCamPos.addScaledVector(right, 0.45);
        }
        lookTarget = focusPoint.clone().add(forward.clone().multiplyScalar(15));
        break;
      }

      case 'TPS_FAR': {
        const dist = isDriving ? 9.5 : 7.8;
        targetCamPos = focusPoint.clone().sub(forward.clone().multiplyScalar(dist));
        lookTarget = focusPoint.clone().add(forward.clone().multiplyScalar(20));
        break;
      }

      case 'TOP_DOWN': {
        targetCamPos = targetPos.clone().add(new THREE.Vector3(0, 42, 0.01));
        lookTarget = targetPos.clone();
        break;
      }

      case 'HOOD_FIRST': {
        if (isDriving && vehicle) {
          // Hood / driver seat camera
          const vForward = new THREE.Vector3(Math.sin(vehicle.heading), 0, Math.cos(vehicle.heading));
          targetCamPos = vehicle.position.clone().add(new THREE.Vector3(0, 1.25, 0)).addScaledVector(vForward, 0.6);
          lookTarget = targetCamPos.clone().add(forward.clone().multiplyScalar(25));
        } else {
          // True first-person FPS view
          targetCamPos = targetPos.clone().add(new THREE.Vector3(0, 1.65, 0));
          lookTarget = targetCamPos.clone().add(forward.clone().multiplyScalar(25));
        }
        break;
      }
    }

    // Smooth camera damping
    this.cameraCurrentPos.lerp(targetCamPos, delta * 15);
    this.cameraCurrentLook.lerp(lookTarget, delta * 18);

    this.camera.position.copy(this.cameraCurrentPos);
    this.camera.lookAt(this.cameraCurrentLook);
  }

  private triggerWasted() {
    this.isGameOver = true;
    this.input.exitPointerLock();
    this.hud.showGameOver('WASTED', '하안 응급실로 후송되었습니다 (-₩50,000)', () => {
      this.respawnPlayer();
    });
  }

  private triggerBusted() {
    this.isGameOver = true;
    this.input.exitPointerLock();
    this.hud.showGameOver('BUSTED', '광명경찰서 하안지구대에 체포되었습니다 (-₩70,000)', () => {
      this.respawnPlayer();
    });
  }

  private respawnPlayer() {
    this.wantedSystem.clearWanted();
    this.missionManager.cancelMission();
    this.player.respawn(new THREE.Vector3(14.5, 0, 20));
    this.isGameOver = false;
    this.hud.setTip('🏥 하안사거리에서 치료를 마치고 복귀했습니다. (클릭하여 시점 활성화)');
  }
}

// Instantiate Game on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
