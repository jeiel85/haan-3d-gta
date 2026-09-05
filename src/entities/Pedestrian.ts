import * as THREE from 'three';
import { soundManager } from '../systems/SoundSystem';

export type PedestrianState = 'WALKING' | 'WAITING' | 'CROSSING' | 'PANIC' | 'DOWN';

export class Pedestrian {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public heading = 0;
  public state: PedestrianState = 'WALKING';

  private targetPoint: THREE.Vector3;
  private animTime = 0;
  private downTimer = 0;
  private panicTimer = 0;

  // Body parts
  private torso: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;

  public collider: THREE.Box3 = new THREE.Box3();
  public isAlive = true;

  constructor(startPos: THREE.Vector3, targetPos: THREE.Vector3) {
    this.position = startPos.clone();
    this.targetPoint = targetPos.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Random stylish Korean streetwear colors
    const clothingColors = [0x2c3e50, 0xe74c3c, 0xf39c12, 0x16a085, 0x8e44ad, 0x27ae60, 0xd35400, 0x7f8c8d];
    const topColor = clothingColors[Math.floor(Math.random() * clothingColors.length)];
    const pantsColor = Math.random() > 0.5 ? 0x1e272e : 0x57606f;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1a4, roughness: 0.6 });
    const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });

    // Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.24), topMat);
    this.torso.position.y = 1.05;
    this.torso.castShadow = true;
    this.mesh.add(this.torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
    head.position.y = 1.48;
    this.mesh.add(head);

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.26), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    hair.position.y = 1.6;
    this.mesh.add(hair);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
    this.leftArm = new THREE.Mesh(armGeo, topMat);
    this.leftArm.position.set(-0.28, 1.0, 0);
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, topMat);
    this.rightArm.position.set(0.28, 1.0, 0);
    this.mesh.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.13, 0.45, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.13, 0.45, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    this.updateCollider();
  }

  public triggerPanic(threatPos: THREE.Vector3) {
    if (this.state === 'DOWN') return;
    this.state = 'PANIC';
    this.panicTimer = 4.0; // panic run for 4 seconds

    // Run directly away from threat
    const awayDir = this.position.clone().sub(threatPos);
    awayDir.y = 0;
    if (awayDir.lengthSq() < 0.1) awayDir.set(1, 0, 0);
    awayDir.normalize();

    this.targetPoint = this.position.clone().addScaledVector(awayDir, 25);
  }

  public hit(impactVelocity: THREE.Vector3): boolean {
    if (this.state === 'DOWN') return false;

    this.state = 'DOWN';
    this.downTimer = 6.0; // knocked down
    this.velocity.copy(impactVelocity).multiplyScalar(0.4);
    this.velocity.y = 3.5;

    // Ragdoll visual rotation
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position.y = 0.2;

    soundManager.playCrash(0.6);
    return true; // crime committed!
  }

  public update(delta: number, playerPos: THREE.Vector3, isCarNearby: boolean, carPos?: THREE.Vector3) {
    if (this.state === 'DOWN') {
      this.downTimer -= delta;
      if (this.velocity.y > 0 || this.position.y > 0.2) {
        this.velocity.y -= 15 * delta;
        this.position.addScaledVector(this.velocity, delta);
        if (this.position.y <= 0.2) {
          this.position.y = 0.2;
          this.velocity.set(0, 0, 0);
        }
        this.mesh.position.copy(this.position);
      }
      if (this.downTimer <= 0) {
        // Recover and stand up
        this.state = 'WALKING';
        this.mesh.rotation.x = 0;
        this.position.y = 0;
      }
      this.updateCollider();
      return;
    }

    // React to car horn or fast car nearby
    if (isCarNearby && carPos && this.state !== 'PANIC') {
      const dist = this.position.distanceTo(carPos);
      if (dist < 9.0) {
        this.triggerPanic(carPos);
      }
    }

    // Move towards target
    const toTarget = this.targetPoint.clone().sub(this.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist < 1.5) {
      if (this.state === 'PANIC') {
        this.state = 'WALKING';
      }
      // Pick a new nearby sidewalk waypoint
      this.pickNewTarget();
    } else {
      toTarget.normalize();
      const speed = this.state === 'PANIC' ? 6.5 : 2.0;

      this.velocity.x = toTarget.x * speed;
      this.velocity.z = toTarget.z * speed;

      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;

      this.heading = Math.atan2(toTarget.x, toTarget.z);
      this.mesh.rotation.y = this.heading;
      this.mesh.position.copy(this.position);

      // Walk / Run animation
      const animFreq = this.state === 'PANIC' ? 15 : 7;
      this.animTime += delta * animFreq;
      const legAngle = Math.sin(this.animTime) * (this.state === 'PANIC' ? 0.8 : 0.45);

      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;
      this.leftArm.rotation.x = -legAngle;
      this.rightArm.rotation.x = legAngle;
    }

    if (this.state === 'PANIC') {
      this.panicTimer -= delta;
      if (this.panicTimer <= 0) {
        this.state = 'WALKING';
      }
    }

    this.updateCollider();
  }

  private pickNewTarget() {
    // Wander along sidewalks of Haan Sageori (sidewalk lines at approx +/- 16m to 25m)
    const sideX = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 8);
    const sideZ = (Math.random() - 0.5) * 140;
    this.targetPoint.set(sideX, 0, sideZ);
  }

  public updateCollider() {
    this.collider.setFromCenterAndSize(
      this.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
      new THREE.Vector3(0.7, 1.6, 0.7)
    );
  }
}
