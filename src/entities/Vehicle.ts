import * as THREE from 'three';
import { soundManager } from '../systems/SoundSystem';

export type VehicleType = 'SEDAN' | 'SPORTS' | 'BUS' | 'SCOOTER' | 'POLICE';

export interface VehicleConfig {
  name: string;
  maxSpeed: number;        // km/h
  acceleration: number;
  brakeForce: number;
  handling: number;        // turn rate
  bodySize: THREE.Vector3;
  color: number;
}

export class Vehicle {
  public mesh: THREE.Group;
  public type: VehicleType;
  public config: VehicleConfig;
  public isPlayerDriving = false;
  public isStolen = false;

  // Physics state
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public speedKmh = 0;
  public heading = 0; // angle in radians around Y
  public steerAngle = 0;
  public isDrifting = false;
  public isBraking = false;
  public isReversing = false;

  // Visual parts
  private wheels: THREE.Mesh[] = [];
  private frontWheels: THREE.Mesh[] = [];
  private headlights: THREE.SpotLight[] = [];
  private taillights: THREE.Mesh[] = [];
  private sirenRedMesh: THREE.Mesh | null = null;
  private sirenBlueMesh: THREE.Mesh | null = null;
  public isSirenOn = false;
  public areHeadlightsOn = true;

  // Bounding box for collisions
  public collider: THREE.Box3 = new THREE.Box3();

  constructor(type: VehicleType, startPos: THREE.Vector3, heading = 0, customColor?: number) {
    this.type = type;
    this.position = startPos.clone();
    this.heading = heading;
    this.config = this.getVehicleConfig(type, customColor);

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;

    this.buildVehicleModel();
    this.updateCollider();
  }

  private getVehicleConfig(type: VehicleType, customColor?: number): VehicleConfig {
    switch (type) {
      case 'SPORTS':
        return {
          name: '하이퍼 GT 스포츠카',
          maxSpeed: 165,
          acceleration: 48,
          brakeForce: 55,
          handling: 2.8,
          bodySize: new THREE.Vector3(2.1, 1.2, 4.4),
          color: customColor || 0xd63031 // crimson
        };
      case 'BUS':
        return {
          name: '광명 마을버스 1-1번',
          maxSpeed: 85,
          acceleration: 22,
          brakeForce: 35,
          handling: 1.6,
          bodySize: new THREE.Vector3(2.8, 3.2, 9.2),
          color: 0x00b894 // Green Korean Maeul Bus
        };
      case 'SCOOTER':
        return {
          name: '배민 라이더 배달 스쿠터',
          maxSpeed: 105,
          acceleration: 44,
          brakeForce: 45,
          handling: 3.5,
          bodySize: new THREE.Vector3(1.0, 1.3, 2.1),
          color: 0x2bcbba // Mint
        };
      case 'POLICE':
        return {
          name: '경기남부경찰 순찰차',
          maxSpeed: 145,
          acceleration: 45,
          brakeForce: 50,
          handling: 2.6,
          bodySize: new THREE.Vector3(2.1, 1.45, 4.6),
          color: 0xf1f2f6 // White with police decals
        };
      case 'SEDAN':
      default:
        return {
          name: '현대 쏘나타 세단',
          maxSpeed: 130,
          acceleration: 36,
          brakeForce: 42,
          handling: 2.3,
          bodySize: new THREE.Vector3(2.0, 1.4, 4.6),
          color: customColor || 0x0984e3 // Blue / Silver / White
        };
    }
  }

  private buildVehicleModel() {
    const { bodySize, color } = this.config;

    if (this.type === 'BUS') {
      this.buildBusModel();
    } else if (this.type === 'SCOOTER') {
      this.buildScooterModel();
    } else {
      this.buildCarModel(color);
    }
  }

  private buildCarModel(bodyColor: number) {
    const { bodySize } = this.config;
    const isSports = this.type === 'SPORTS';
    const isPolice = this.type === 'POLICE';

    // 1. Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(bodySize.x, bodySize.y * 0.55, bodySize.z);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.2,
      metalness: 0.6
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = bodySize.y * 0.45;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this.mesh.add(chassis);

    // 2. Cabin / Roof with tinted glass windows
    const cabinW = bodySize.x * 0.88;
    const cabinH = bodySize.y * 0.5;
    const cabinL = bodySize.z * (isSports ? 0.48 : 0.56);
    const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL);
    const cabinMat = new THREE.MeshPhysicalMaterial({
      color: 0x111620,
      transmission: 0.4,
      roughness: 0.1,
      metalness: 0.9
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, bodySize.y * 0.85, isSports ? -0.2 : -0.15);
    cabin.castShadow = true;
    this.mesh.add(cabin);

    // Roof top panel
    const roofGeo = new THREE.BoxGeometry(cabinW * 0.96, 0.08, cabinL * 0.96);
    const roofMat = new THREE.MeshStandardMaterial({ color: isPolice ? 0xffffff : bodyColor, roughness: 0.3 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, bodySize.y * 0.85 + cabinH / 2 + 0.04, isSports ? -0.2 : -0.15);
    this.mesh.add(roof);

    // Police Decals & Lightbar
    if (isPolice) {
      // Blue stripe decal on sides
      const decalGeo = new THREE.BoxGeometry(bodySize.x + 0.04, 0.28, bodySize.z * 0.8);
      const decalMat = new THREE.MeshStandardMaterial({ color: 0x0033aa });
      const decal = new THREE.Mesh(decalGeo, decalMat);
      decal.position.y = bodySize.y * 0.45;
      this.mesh.add(decal);

      // Lightbar base
      const barBaseGeo = new THREE.BoxGeometry(cabinW * 0.75, 0.12, 0.35);
      const barBase = new THREE.Mesh(barBaseGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
      barBase.position.set(0, bodySize.y * 0.85 + cabinH / 2 + 0.14, -0.15);
      this.mesh.add(barBase);

      // Red and Blue emergency strobe lights
      const sirenGeo = new THREE.BoxGeometry(cabinW * 0.32, 0.18, 0.3);
      this.sirenRedMesh = new THREE.Mesh(sirenGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      this.sirenRedMesh.position.set(-cabinW * 0.2, bodySize.y * 0.85 + cabinH / 2 + 0.24, -0.15);
      this.mesh.add(this.sirenRedMesh);

      this.sirenBlueMesh = new THREE.Mesh(sirenGeo, new THREE.MeshBasicMaterial({ color: 0x0044ff }));
      this.sirenBlueMesh.position.set(cabinW * 0.2, bodySize.y * 0.85 + cabinH / 2 + 0.24, -0.15);
      this.mesh.add(this.sirenBlueMesh);
    }

    // Sports Spoiler
    if (isSports) {
      const wingGeo = new THREE.BoxGeometry(bodySize.x * 0.95, 0.08, 0.45);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(0, bodySize.y * 0.9, -bodySize.z / 2 + 0.3);
      this.mesh.add(wing);

      // Spoiler struts
      [-0.6, 0.6].forEach(xOff => {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35), wingMat);
        strut.position.set(xOff, bodySize.y * 0.75, -bodySize.z / 2 + 0.3);
        this.mesh.add(strut);
      });
    }

    // Wheels
    this.addWheels(bodySize.x / 2 - 0.1, bodySize.z * 0.32, bodySize.y * 0.32, 0.36, 0.24);

    // Headlights & Taillights
    this.addLights(bodySize.x * 0.38, bodySize.y * 0.45, bodySize.z / 2);
  }

  private buildBusModel() {
    const { bodySize } = this.config;

    // Bus body
    const bodyGeo = new THREE.BoxGeometry(bodySize.x, bodySize.y * 0.82, bodySize.z);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x00b894, // Green Gwangmyeong Bus
      roughness: 0.3,
      metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bodySize.y * 0.52;
    body.castShadow = true;
    body.receiveShadow = true;
    this.mesh.add(body);

    // Bus roof
    const roofGeo = new THREE.BoxGeometry(bodySize.x * 0.98, 0.2, bodySize.z * 0.98);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = bodySize.y * 0.94;
    this.mesh.add(roof);

    // Destination LED board ("하안사거리 ↔ 철산역")
    const ledCanvas = document.createElement('canvas');
    ledCanvas.width = 256;
    ledCanvas.height = 64;
    const ctx = ledCanvas.getContext('2d')!;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 22px "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('하안사거리 ↔ 철산역', 128, 32);

    const ledTex = new THREE.CanvasTexture(ledCanvas);
    const ledMat = new THREE.MeshBasicMaterial({ map: ledTex });
    const ledMesh = new THREE.Mesh(new THREE.PlaneGeometry(bodySize.x * 0.7, 0.5), ledMat);
    ledMesh.position.set(0, bodySize.y * 0.8, bodySize.z / 2 + 0.02);
    this.mesh.add(ledMesh);

    // Windows strips along both sides
    const winMat = new THREE.MeshPhysicalMaterial({ color: 0x1a2634, transmission: 0.5, roughness: 0.1 });
    const winGeo = new THREE.BoxGeometry(bodySize.x + 0.04, 0.85, bodySize.z * 0.82);
    const windows = new THREE.Mesh(winGeo, winMat);
    windows.position.y = bodySize.y * 0.62;
    this.mesh.add(windows);

    // 6 Wheels for bus
    this.addWheels(bodySize.x / 2 - 0.12, bodySize.z * 0.35, 0.5, 0.52, 0.32);
    this.addLights(bodySize.x * 0.36, bodySize.y * 0.3, bodySize.z / 2);
  }

  private buildScooterModel() {
    // Scooter chassis
    const chassisGeo = new THREE.BoxGeometry(0.5, 0.45, 1.8);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x2bcbba, roughness: 0.3 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.45;
    this.mesh.add(chassis);

    // Handlebars & Windshield
    const barGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.85);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
    const handlebar = new THREE.Mesh(barGeo, barMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 0.95, 0.6);
    this.mesh.add(handlebar);

    // Baedal / Delivery Box on rear
    const boxGeo = new THREE.BoxGeometry(0.7, 0.6, 0.65);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x2bcbba,
      emissive: 0x005544,
      emissiveIntensity: 0.2
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 0.85, -0.6);
    box.castShadow = true;
    this.mesh.add(box);

    // Delivery Box text sticker ("배달의 하안")
    const stickerCanvas = document.createElement('canvas');
    stickerCanvas.width = 128;
    stickerCanvas.height = 128;
    const ctx = stickerCanvas.getContext('2d')!;
    ctx.fillStyle = '#2bcbba';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('배달특급', 64, 55);
    ctx.fillText('하안점', 64, 85);

    const stickerTex = new THREE.CanvasTexture(stickerCanvas);
    const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: stickerTex }));
    sticker.position.set(0, 0.85, -0.93);
    sticker.rotation.y = Math.PI;
    this.mesh.add(sticker);

    // Front & Rear Single Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.16, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

    const fWheel = new THREE.Mesh(wheelGeo, wheelMat);
    fWheel.rotation.z = Math.PI / 2;
    fWheel.position.set(0, 0.25, 0.7);
    this.mesh.add(fWheel);
    this.wheels.push(fWheel);
    this.frontWheels.push(fWheel);

    const rWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rWheel.rotation.z = Math.PI / 2;
    rWheel.position.set(0, 0.25, -0.6);
    this.mesh.add(rWheel);
    this.wheels.push(rWheel);

    // Headlight
    const light = new THREE.SpotLight(0xffffff, 2.5, 30, Math.PI / 6, 0.3);
    light.position.set(0, 0.75, 0.9);
    light.target.position.set(0, 0, 15);
    this.mesh.add(light);
    this.mesh.add(light.target);
    this.headlights.push(light);
  }

  private addWheels(xOffset: number, zOffset: number, yPos: number, radius = 0.36, width = 0.24) {
    const wheelGeo = new THREE.CylinderGeometry(radius, radius, width, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8 });

    const positions = [
      { x: xOffset, z: zOffset, isFront: true },
      { x: -xOffset, z: zOffset, isFront: true },
      { x: xOffset, z: -zOffset, isFront: false },
      { x: -xOffset, z: -zOffset, isFront: false }
    ];

    positions.forEach(p => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(p.x, yPos, p.z);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.01, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      this.mesh.add(wheelGroup);
      this.wheels.push(tire);
      if (p.isFront) {
        this.frontWheels.push(wheelGroup as unknown as THREE.Mesh);
      }
    });
  }

  private addLights(xOffset: number, yPos: number, zFront: number) {
    // Front Headlights
    [-xOffset, xOffset].forEach(x => {
      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      headMesh.position.set(x, yPos, zFront + 0.02);
      this.mesh.add(headMesh);

      const spot = new THREE.SpotLight(0xffffff, 2.5, 45, Math.PI / 7, 0.4);
      spot.position.set(x, yPos, zFront + 0.1);
      spot.target.position.set(x, 0, zFront + 25);
      this.mesh.add(spot);
      this.mesh.add(spot.target);
      this.headlights.push(spot);
    });

    // Rear Taillights
    [-xOffset, xOffset].forEach(x => {
      const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), new THREE.MeshBasicMaterial({ color: 0xdd1111 }));
      tailMesh.position.set(x, yPos, -zFront - 0.02);
      this.mesh.add(tailMesh);
      this.taillights.push(tailMesh);
    });
  }

  public toggleHeadlights() {
    this.areHeadlightsOn = !this.areHeadlightsOn;
    this.headlights.forEach(hl => {
      hl.visible = this.areHeadlightsOn;
    });
  }

  public setSiren(active: boolean) {
    this.isSirenOn = active;
    if (this.isPlayerDriving) {
      soundManager.setPoliceSiren(active);
    }
  }

  /**
   * Updates arcade driving physics and visual effects
   */
  public updatePhysics(
    delta: number,
    throttle: number,   // -1 (reverse/brake) to +1 (accelerate)
    steer: number,      // -1 (left) to +1 (right)
    handbrake: boolean
  ) {
    const cfg = this.config;

    // 1. Steering
    const targetSteer = steer * (cfg.handling * 0.18);
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, delta * 8);

    // 2. Acceleration / Braking
    const forwardVec = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const currentSpeed = this.velocity.dot(forwardVec);
    this.speedKmh = currentSpeed * 3.6;

    if (throttle > 0) {
      // Accelerating forward
      const maxForward = cfg.maxSpeed / 3.6;
      if (currentSpeed < maxForward) {
        this.velocity.addScaledVector(forwardVec, throttle * cfg.acceleration * delta);
      }
    } else if (throttle < 0) {
      // Braking or Reversing
      if (currentSpeed > 1.0) {
        // Braking
        this.velocity.addScaledVector(forwardVec, -cfg.brakeForce * delta);
        this.isBraking = true;
      } else {
        // Reverse gear
        const maxReverse = -(cfg.maxSpeed * 0.35) / 3.6;
        if (currentSpeed > maxReverse) {
          this.velocity.addScaledVector(forwardVec, throttle * (cfg.acceleration * 0.6) * delta);
        }
        this.isReversing = true;
      }
    } else {
      this.isBraking = false;
      this.isReversing = false;
    }

    // 3. Handbrake Drift
    this.isDrifting = handbrake && Math.abs(currentSpeed) > 6;
    if (this.isDrifting && this.isPlayerDriving) {
      soundManager.playTireSkid();
    }

    // 4. Natural Friction & Drag
    const dragCoeff = this.isDrifting ? 0.94 : 0.985;
    this.velocity.multiplyScalar(Math.pow(dragCoeff, delta * 60));

    // Lateral grip friction (prevents infinite ice sliding except in drift)
    const rightVec = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
    const lateralSpeed = this.velocity.dot(rightVec);
    const gripFactor = this.isDrifting ? 0.8 : 0.15; // lower grip during drift
    this.velocity.addScaledVector(rightVec, -lateralSpeed * (1 - gripFactor));

    // 5. Yaw Turn rotation based on speed & steer angle (D turns Right, A turns Left)
    if (Math.abs(currentSpeed) > 0.2) {
      const turnDir = currentSpeed > 0 ? 1 : -1;
      const speedTurnFactor = Math.min(Math.abs(currentSpeed) / 12, 1.2);
      this.heading -= this.steerAngle * turnDir * speedTurnFactor * delta * 2.8;
      this.mesh.rotation.y = this.heading;
    }

    // 6. Apply Movement
    this.position.addScaledVector(this.velocity, delta);
    this.mesh.position.copy(this.position);

    // 7. Suspension Tilt & Roll (natural turn roll)
    const rollAngle = this.steerAngle * (currentSpeed / (cfg.maxSpeed / 3.6)) * 0.15;
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, rollAngle, delta * 10);

    // 8. Animate Front Wheels Steering (match turn direction)
    this.frontWheels.forEach(w => {
      w.rotation.y = -this.steerAngle * 1.5;
    });

    // 9. Siren Lights Flashing for Police
    if (this.type === 'POLICE' && this.isSirenOn && this.sirenRedMesh && this.sirenBlueMesh) {
      const flash = Math.floor(Date.now() / 150) % 2 === 0;
      (this.sirenRedMesh.material as THREE.MeshBasicMaterial).color.setHex(flash ? 0xff0000 : 0x220000);
      (this.sirenBlueMesh.material as THREE.MeshBasicMaterial).color.setHex(flash ? 0x001144 : 0x0066ff);
    }

    // 10. Update Collider
    this.updateCollider();

    // 11. Engine Sound Update
    if (this.isPlayerDriving) {
      soundManager.updateEngineSound(this.speedKmh, true, throttle > 0);
    }
  }

  public updateCollider() {
    const half = this.config.bodySize.clone().multiplyScalar(0.5);
    this.collider.setFromCenterAndSize(
      this.position.clone().add(new THREE.Vector3(0, half.y, 0)),
      this.config.bodySize
    );
  }

  public stopEngineSound() {
    soundManager.updateEngineSound(0, false, false);
    if (this.isSirenOn) {
      soundManager.setPoliceSiren(false);
    }
  }
}
