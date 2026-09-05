import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Vehicle } from '../entities/Vehicle';
import { Pedestrian } from '../entities/Pedestrian';
import { CityMap } from '../world/CityMap';
import { soundManager } from './SoundSystem';

export class Physics {
  private cityMap: CityMap;

  constructor(cityMap: CityMap) {
    this.cityMap = cityMap;
  }

  /**
   * Resolves collisions for player on foot
   */
  public updatePlayerCollisions(player: Player): void {
    if (player.isDriving) return;

    // Check against world colliders (buildings, poles, bus stops)
    for (const box of this.cityMap.colliders) {
      if (player.collider.intersectsBox(box)) {
        // Simple push-back along dominant axis
        const playerCenter = player.collider.getCenter(new THREE.Vector3());
        const boxCenter = box.getCenter(new THREE.Vector3());
        const diff = playerCenter.sub(boxCenter);
        diff.y = 0;
        diff.normalize();

        player.position.addScaledVector(diff, 0.25);
        player.velocity.x *= 0.5;
        player.velocity.z *= 0.5;
        player.updateCollider();
      }
    }

    // Check Collectibles
    for (const col of this.cityMap.collectibles) {
      if (!col.collected) {
        if (player.position.distanceTo(col.position) < 2.2) {
          col.collected = true;
          col.mesh.visible = false;
          if (col.type === 'coin') {
            player.addCash(col.value);
          }
        }
      }
    }
  }

  /**
   * Resolves vehicle collisions with world buildings, obstacles, other cars, and collectibles
   */
  public updateVehicleCollisions(
    v: Vehicle,
    otherVehicles: Vehicle[],
    onHitPedestrian?: (ped: Pedestrian) => void,
    onHitPolice?: () => void
  ): void {
    // 1. World Colliders (Buildings, streetlights)
    for (const box of this.cityMap.colliders) {
      if (v.collider.intersectsBox(box)) {
        const vCenter = v.collider.getCenter(new THREE.Vector3());
        const boxCenter = box.getCenter(new THREE.Vector3());
        const normal = vCenter.sub(boxCenter);
        normal.y = 0;
        normal.normalize();

        // Rebound
        v.position.addScaledVector(normal, 0.45);
        v.velocity.reflect(normal).multiplyScalar(0.4);

        if (v.isPlayerDriving) {
          soundManager.playCrash(Math.abs(v.speedKmh) / 60);
        }
        v.updateCollider();
      }
    }

    // 2. Collisions between this vehicle and other vehicles
    for (const other of otherVehicles) {
      if (other === v) continue;

      if (v.collider.intersectsBox(other.collider)) {
        const normal = v.position.clone().sub(other.position);
        normal.y = 0;
        if (normal.lengthSq() < 0.01) normal.set(0, 0, 1);
        normal.normalize();

        // Push apart
        v.position.addScaledVector(normal, 0.35);
        other.position.addScaledVector(normal, -0.35);

        // Exchange velocities
        const relVel = v.velocity.clone().sub(other.velocity);
        const impulse = normal.clone().multiplyScalar(relVel.dot(normal) * 0.7);

        v.velocity.sub(impulse);
        other.velocity.add(impulse);

        if (v.isPlayerDriving || other.isPlayerDriving) {
          soundManager.playCrash(0.8);
          if (other.type === 'POLICE' && onHitPolice) {
            onHitPolice();
          }
        }

        v.updateCollider();
        other.updateCollider();
      }
    }

    // 3. Collectibles when driving
    if (v.isPlayerDriving) {
      for (const col of this.cityMap.collectibles) {
        if (!col.collected) {
          if (v.position.distanceTo(col.position) < 3.2) {
            col.collected = true;
            col.mesh.visible = false;
          }
        }
      }
    }
  }

  /**
   * Resolves vehicle vs pedestrian impacts
   */
  public checkVehiclePedestrianCollisions(
    v: Vehicle,
    pedestrians: Pedestrian[],
    onPedestrianHit: (ped: Pedestrian) => void
  ): void {
    if (Math.abs(v.speedKmh) < 8) return; // ignore static touch

    for (const ped of pedestrians) {
      if (ped.state === 'DOWN') continue;

      if (v.collider.intersectsBox(ped.collider)) {
        const hitSuccess = ped.hit(v.velocity);
        if (hitSuccess && v.isPlayerDriving) {
          onPedestrianHit(ped);
        }
      }
    }
  }
}
