import * as THREE from 'three';
import { Vehicle } from './Vehicle';
import { soundManager } from '../systems/SoundSystem';

export class Player {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public heading = 0; // facing angle
  public isGrounded = true;

  // Stats
  public health = 100;
  public maxHealth = 100;
  public armor = 100;
  public maxArmor = 100;
  public cash = 500000;

  // Vehicle driving state
  public currentVehicle: Vehicle | null = null;
  public isDriving = false;

  // Procedural Animation Body Parts
  private torso: THREE.Mesh;
  private head: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;

  private animTime = 0;
  private isPunching = false;
  private punchTimer = 0;

  public collider: THREE.Box3 = new THREE.Box3();
  public readonly RADIUS = 0.5;
  public readonly HEIGHT = 1.8;

  constructor(startPos: THREE.Vector3) {
    this.position = startPos.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // 1. Build Humanoid Character
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1a4, roughness: 0.6 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.5 }); // Dark streetwear jacket
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3c40c6, roughness: 0.7 });  // Denim blue pants
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });                   // White sneakers

    // Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.28), jacketMat);
    this.torso.position.y = 1.15;
    this.torso.castShadow = true;
    this.mesh.add(this.torso);

    // Head with hair
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.28), skinMat);
    this.head.position.y = 1.62;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    // Hair cap
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    hair.position.set(0, 1.76, 0);
    this.mesh.add(hair);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
    this.leftArm = new THREE.Mesh(armGeo, jacketMat);
    this.leftArm.position.set(-0.35, 1.1, 0);
    this.leftArm.castShadow = true;
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, jacketMat);
    this.rightArm.position.set(0.35, 1.1, 0);
    this.rightArm.castShadow = true;
    this.mesh.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.16, 0.5, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.16, 0.5, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.2, 0.12, 0.28);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.16, 0.08, 0.04);
    this.mesh.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.16, 0.08, 0.04);
    this.mesh.add(rightShoe);

    this.updateCollider();
  }

  public punch(): boolean {
    if (this.isDriving || this.isPunching) return false;
    this.isPunching = true;
    this.punchTimer = 0.3; // 300ms punch
    soundManager.playPunch();
    return true;
  }

  public takeDamage(amount: number) {
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.7);
      this.armor -= absorbed;
      amount -= absorbed;
    }
    this.health = Math.max(0, this.health - amount);
  }

  public heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  public addCash(amount: number) {
    this.cash += amount;
    soundManager.playCashSound();
  }

  /**
   * Enter nearest vehicle
   */
  public enterVehicle(vehicle: Vehicle) {
    this.currentVehicle = vehicle;
    this.isDriving = true;
    vehicle.isPlayerDriving = true;
    this.mesh.visible = false;
    soundManager.playCarDoor();
  }

  /**
   * Exit current vehicle safely onto the left side
   */
  public exitVehicle() {
    if (!this.currentVehicle) return;

    const v = this.currentVehicle;
    v.isPlayerDriving = false;
    v.stopEngineSound();

    // Position player safely outside the driver side
    const exitOffset = new THREE.Vector3(-v.config.bodySize.x / 2 - 1.2, 0, 0);
    exitOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), v.heading);
    this.position.copy(v.position).add(exitOffset);
    this.position.y = 0;
    this.velocity.set(0, 0, 0);
    this.heading = v.heading;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;
    this.mesh.visible = true;

    this.currentVehicle = null;
    this.isDriving = false;
    soundManager.playCarDoor();
  }

  /**
   * Finds the nearest vehicle within boarding distance (3.8m)
   */
  public findNearestVehicle(vehicles: Vehicle[]): Vehicle | null {
    let nearest: Vehicle | null = null;
    let minDist = 4.2;

    vehicles.forEach(v => {
      const dist = this.position.distanceTo(v.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = v;
      }
    });

    return nearest;
  }

  /**
   * Updates foot locomotion, jumping, and procedural skeletal animation
   */
  public updateOnFoot(
    delta: number,
    moveX: number,     // -1 (left) to +1 (right) relative to camera
    moveZ: number,     // -1 (back) to +1 (forward) relative to camera
    isSprinting: boolean,
    isJumping: boolean,
    cameraAngle: number
  ) {
    if (this.isDriving) return;

    // Movement direction in world space
    const inputDir = new THREE.Vector3(moveX, 0, moveZ);
    const hasInput = inputDir.lengthSq() > 0.01;

    if (hasInput) {
      inputDir.normalize();
      inputDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);

      // Target move speed
      const baseSpeed = isSprinting ? 9.5 : 4.8;
      const targetVel = inputDir.clone().multiplyScalar(baseSpeed);

      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVel.x, delta * 12);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVel.z, delta * 12);

      // Face move direction smoothly
      const targetHeading = Math.atan2(inputDir.x, inputDir.z);
      this.heading = THREE.MathUtils.lerp(this.heading, targetHeading, delta * 14);
      this.mesh.rotation.y = this.heading;
    } else {
      // Decelerate
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, delta * 15);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, delta * 15);
    }

    // Jump & Gravity
    if (isJumping && this.isGrounded) {
      this.velocity.y = 7.2;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.velocity.y -= 19.6 * delta; // Gravity
    }

    // Apply movement
    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;
    this.position.z += this.velocity.z * delta;

    // Floor collision
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    this.mesh.position.copy(this.position);
    this.updateCollider();

    // Procedural Locomotion Animations
    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    this.updateProceduralAnimation(delta, horizontalSpeed, isSprinting);
  }

  private updateProceduralAnimation(delta: number, speed: number, isSprinting: boolean) {
    // Punch Animation
    if (this.isPunching) {
      this.punchTimer -= delta;
      const progress = 1 - Math.max(0, this.punchTimer / 0.3);
      const thrust = Math.sin(progress * Math.PI);
      this.rightArm.position.z = thrust * 0.45;
      this.rightArm.rotation.x = -thrust * 1.3;

      if (this.punchTimer <= 0) {
        this.isPunching = false;
        this.rightArm.position.z = 0;
        this.rightArm.rotation.x = 0;
      }
      return;
    }

    if (!this.isGrounded) {
      // Airborne Jump Pose
      this.leftLeg.rotation.x = -0.4;
      this.rightLeg.rotation.x = 0.3;
      this.leftArm.rotation.x = 0.6;
      this.rightArm.rotation.x = -0.6;
      return;
    }

    if (speed > 0.2) {
      // Walking / Running Cycle
      const animFreq = isSprinting ? 16 : 9;
      this.animTime += delta * animFreq;

      const legAngle = Math.sin(this.animTime) * (isSprinting ? 0.9 : 0.55);
      const armAngle = -legAngle * 0.85;

      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      this.leftArm.rotation.x = armAngle;
      this.rightArm.rotation.x = -armAngle;

      // Subtle torso bobbing
      this.torso.position.y = 1.15 + Math.abs(Math.cos(this.animTime)) * 0.05;
      this.head.position.y = 1.62 + Math.abs(Math.cos(this.animTime)) * 0.05;
    } else {
      // Idle Breathing
      this.animTime += delta * 2;
      const breath = Math.sin(this.animTime) * 0.02;
      this.torso.position.y = 1.15 + breath;
      this.head.position.y = 1.62 + breath;

      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }
  }

  public updateCollider() {
    this.collider.setFromCenterAndSize(
      this.position.clone().add(new THREE.Vector3(0, this.HEIGHT / 2, 0)),
      new THREE.Vector3(this.RADIUS * 2, this.HEIGHT, this.RADIUS * 2)
    );
  }

  public respawn(crossroadPos: THREE.Vector3) {
    this.health = 100;
    this.armor = 50;
    this.cash = Math.max(0, this.cash - 50000);
    this.position.copy(crossroadPos);
    this.position.y = 0;
    this.velocity.set(0, 0, 0);
    this.mesh.position.copy(this.position);
    this.mesh.visible = true;
    this.currentVehicle = null;
    this.isDriving = false;
  }
}
