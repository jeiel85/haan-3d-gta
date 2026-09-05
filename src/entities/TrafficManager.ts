import * as THREE from 'three';
import { Vehicle, VehicleType } from './Vehicle';
import { CityMap } from '../world/CityMap';

interface TrafficLane {
  id: string;
  isNorthSouth: boolean;
  fixedCoord: number; // x for NS, z for EW
  direction: number;  // +1 or -1
  heading: number;
}

export class TrafficManager {
  public scene: THREE.Scene;
  public cityMap: CityMap;
  public vehicles: Vehicle[] = [];
  private lanes: TrafficLane[] = [];

  constructor(scene: THREE.Scene, cityMap: CityMap) {
    this.scene = scene;
    this.cityMap = cityMap;
    this.initLanes();
    this.spawnInitialTraffic();
  }

  private initLanes() {
    // Ori-ro (오리로 NS - Right-hand traffic)
    // Northbound (heading: Math.PI, toward -Z) on East (+X) side
    this.lanes.push({ id: 'NS_NB_1', isNorthSouth: true, fixedCoord: 4.5, direction: -1, heading: Math.PI });
    this.lanes.push({ id: 'NS_NB_2', isNorthSouth: true, fixedCoord: 8.5, direction: -1, heading: Math.PI });
    // Southbound (heading: 0, toward +Z) on West (-X) side
    this.lanes.push({ id: 'NS_SB_1', isNorthSouth: true, fixedCoord: -4.5, direction: 1, heading: 0 });
    this.lanes.push({ id: 'NS_SB_2', isNorthSouth: true, fixedCoord: -8.5, direction: 1, heading: 0 });

    // Haan-ro (하안로 EW - Right-hand traffic)
    // Eastbound (heading: Math.PI/2, toward +X) on South (+Z) side
    this.lanes.push({ id: 'EW_EB_1', isNorthSouth: false, fixedCoord: 4.5, direction: 1, heading: Math.PI / 2 });
    this.lanes.push({ id: 'EW_EB_2', isNorthSouth: false, fixedCoord: 8.5, direction: 1, heading: Math.PI / 2 });
    // Westbound (heading: -Math.PI/2, toward -X) on North (-Z) side
    this.lanes.push({ id: 'EW_WB_1', isNorthSouth: false, fixedCoord: -4.5, direction: -1, heading: -Math.PI / 2 });
    this.lanes.push({ id: 'EW_WB_2', isNorthSouth: false, fixedCoord: -8.5, direction: -1, heading: -Math.PI / 2 });
  }

  private spawnInitialTraffic() {
    const types: VehicleType[] = ['SEDAN', 'SEDAN', 'SPORTS', 'BUS', 'SCOOTER'];

    // Spawn 10 ambient cars along various lanes
    this.lanes.forEach((lane, idx) => {
      const type = types[idx % types.length];
      const startDist = -120 + Math.random() * 240;

      // don't spawn right inside the intersection
      if (Math.abs(startDist) < 20) return;

      const pos = lane.isNorthSouth
        ? new THREE.Vector3(lane.fixedCoord, 0, startDist)
        : new THREE.Vector3(startDist, 0, lane.fixedCoord);

      const car = new Vehicle(type, pos, lane.heading);
      this.scene.add(car.mesh);
      this.vehicles.push(car);
    });
  }

  public update(delta: number, playerVehicle: Vehicle | null, playerPos: THREE.Vector3) {
    const mapHalf = this.cityMap.MAP_SIZE / 2 - 15;

    this.vehicles.forEach(car => {
      // Don't drive if player is currently in this vehicle
      if (car.isPlayerDriving) return;

      // Determine road direction
      const forwardVec = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
      const isNS = Math.abs(forwardVec.z) > Math.abs(forwardVec.x);

      // Check traffic signal before crossing Haan Sageori intersection
      const signal = this.cityMap.getTrafficSignalForLane(isNS);
      let shouldStop = false;

      // Check distance to intersection center (0, 0)
      const distToCenter = car.position.length();
      const isApproachingCenter = (isNS ? car.position.z * forwardVec.z < 0 : car.position.x * forwardVec.x < 0);

      if (isApproachingCenter && distToCenter > 16 && distToCenter < 30) {
        if (signal === 'RED' || signal === 'YELLOW') {
          shouldStop = true;
        }
      }

      // Check for vehicle or obstacle ahead
      const rayStart = car.position.clone().add(new THREE.Vector3(0, 0.8, 0));
      const lookDist = 12.0;

      this.vehicles.forEach(other => {
        if (other === car) return;
        const toOther = other.position.clone().sub(car.position);
        if (toOther.dot(forwardVec) > 0 && toOther.length() < lookDist) {
          shouldStop = true;
        }
      });

      if (playerVehicle && playerVehicle !== car) {
        const toPlayer = playerVehicle.position.clone().sub(car.position);
        if (toPlayer.dot(forwardVec) > 0 && toPlayer.length() < lookDist) {
          shouldStop = true;
        }
      }

      // Drive AI
      const throttle = shouldStop ? -0.8 : 0.6;
      car.updatePhysics(delta, throttle, 0, false);

      // Despawn and recycle if out of map bounds
      if (Math.abs(car.position.x) > mapHalf || Math.abs(car.position.z) > mapHalf) {
        this.recycleVehicle(car);
      }
    });
  }

  private recycleVehicle(car: Vehicle) {
    // Pick random lane
    const lane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
    const spawnDist = -lane.direction * (this.cityMap.MAP_SIZE / 2 - 25);

    car.position = lane.isNorthSouth
      ? new THREE.Vector3(lane.fixedCoord, 0, spawnDist)
      : new THREE.Vector3(spawnDist, 0, lane.fixedCoord);

    car.heading = lane.heading;
    car.velocity.set(0, 0, 0);
    car.speedKmh = 0;
    car.mesh.position.copy(car.position);
    car.mesh.rotation.y = car.heading;
  }
}
