import * as THREE from 'three';
import { Vehicle } from '../entities/Vehicle';
import { soundManager } from './SoundSystem';

export class WantedSystem {
  public scene: THREE.Scene;
  public stars = 0;
  public policeCars: Vehicle[] = [];

  private evadeTimer = 0;
  private readonly EVADE_DURATION = 14; // seconds to lose a star when out of sight
  private bustedTimer = 0;
  public isBusted = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public addCrime(starsToAdd = 1) {
    const oldStars = this.stars;
    this.stars = Math.min(5, Math.max(1, this.stars + starsToAdd));
    this.evadeTimer = this.EVADE_DURATION;

    // Spawn police cars if new star level reached
    if (this.stars > oldStars) {
      this.adjustPoliceResponse();
    }
  }

  public reduceStar(count = 1) {
    this.stars = Math.max(0, this.stars - count);
    this.adjustPoliceResponse();
  }

  public clearWanted() {
    this.stars = 0;
    this.adjustPoliceResponse();
  }

  private adjustPoliceResponse() {
    const desiredPoliceCount = this.stars === 0 ? 0 : Math.min(this.stars, 4);

    // Remove excess police cars
    while (this.policeCars.length > desiredPoliceCount) {
      const removed = this.policeCars.pop();
      if (removed) {
        this.scene.remove(removed.mesh);
        removed.setSiren(false);
      }
    }

    // Spawn required police cars
    while (this.policeCars.length < desiredPoliceCount) {
      this.spawnPoliceCar();
    }
  }

  private spawnPoliceCar() {
    // Spawn police car from an outer road segment (approx 75m away from center)
    const roadAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const angle = roadAngles[Math.floor(Math.random() * roadAngles.length)];
    const dist = 65 + Math.random() * 30;

    const spawnPos = new THREE.Vector3(
      Math.sin(angle) * dist,
      0,
      Math.cos(angle) * dist
    );

    const policeCar = new Vehicle('POLICE', spawnPos, angle + Math.PI);
    policeCar.setSiren(true);
    this.scene.add(policeCar.mesh);
    this.policeCars.push(policeCar);
  }

  public update(delta: number, playerPos: THREE.Vector3, playerSpeed: number): { isBusted: boolean; starsChanged: boolean } {
    let starsChanged = false;

    if (this.stars === 0) {
      this.bustedTimer = 0;
      return { isBusted: false, starsChanged: false };
    }

    // Check if player is evading police
    let isNearPolice = false;

    this.policeCars.forEach(cop => {
      const dist = cop.position.distanceTo(playerPos);
      if (dist < 40) {
        isNearPolice = true;
      }

      // Police pursuit AI
      const toPlayer = playerPos.clone().sub(cop.position);
      toPlayer.y = 0;
      const targetDist = toPlayer.length();

      toPlayer.normalize();

      // Desired heading towards player
      const targetHeading = Math.atan2(toPlayer.x, toPlayer.z);
      let angleDiff = targetHeading - cop.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const steer = Math.min(Math.max(angleDiff * 1.8, -1), 1);
      const throttle = targetDist > 4 ? 0.95 : 0.2;

      cop.updatePhysics(delta, throttle, steer, Math.abs(angleDiff) > 1.2);

      // Check Busted condition (player car cornered or very slow next to police)
      if (dist < 4.5 && Math.abs(playerSpeed) < 3.0) {
        this.bustedTimer += delta;
        if (this.bustedTimer > 3.2) {
          this.isBusted = true;
        }
      }
    });

    // If out of police proximity, tick down evade timer
    if (!isNearPolice) {
      this.evadeTimer -= delta;
      if (this.evadeTimer <= 0) {
        this.stars--;
        starsChanged = true;
        this.evadeTimer = this.EVADE_DURATION;
        this.adjustPoliceResponse();
      }
    } else {
      this.evadeTimer = this.EVADE_DURATION;
    }

    return { isBusted: this.isBusted, starsChanged };
  }
}
