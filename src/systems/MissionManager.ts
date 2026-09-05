import * as THREE from 'three';
import { soundManager } from './SoundSystem';

export interface Mission {
  id: string;
  title: string;
  description: string;
  pickupPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetName: string;
  timeLimit: number;
  reward: number;
  stage: 'PICKUP' | 'DELIVER' | 'SURVIVE';
}

export class MissionManager {
  public scene: THREE.Scene;
  public currentMission: Mission | null = null;
  public remainingTime = 0;
  public isMissionActive = false;

  // 3D Visual Marker Beacon
  private markerMesh: THREE.Group;
  private markerCylinder: THREE.Mesh;
  private markerRing: THREE.Mesh;

  private missionPool: Mission[] = [
    {
      id: 'm_baemin_1',
      title: '🛵 [배달 특급] 메가MGC커피 하안점 배달',
      description: '메가커피에서 아이스 아메리카노 4잔을 픽업하여 하안주공 7단지 704동으로 총알 배달하세요!',
      pickupPos: new THREE.Vector3(38, 0, -40),
      targetPos: new THREE.Vector3(95, 0, 135),
      targetName: '하안주공 7단지 704동',
      timeLimit: 55,
      reward: 85000,
      stage: 'PICKUP'
    },
    {
      id: 'm_baemin_2',
      title: '🛵 [배달 특급] 파리바게뜨 하안사거리점',
      description: '파리바게뜨에서 갓 구운 빵 세트를 수령하여 하안주공 12단지 1201동으로 신속 배달!',
      pickupPos: new THREE.Vector3(-40, 0, 38),
      targetPos: new THREE.Vector3(-95, 0, -85),
      targetName: '하안주공 12단지 1201동',
      timeLimit: 50,
      reward: 95000,
      stage: 'PICKUP'
    },
    {
      id: 'm_taxi_1',
      title: '🚕 [하안 총알택시] 학원 귀가 학생 수송',
      description: '하안사거리 정류장에서 학원 학생을 승차시켜 하안주공 8단지 803동으로 안전하게 모셔다 주세요!',
      pickupPos: new THREE.Vector3(15, 0, 28),
      targetPos: new THREE.Vector3(-95, 0, 135),
      targetName: '하안주공 8단지 803동',
      timeLimit: 48,
      reward: 75000,
      stage: 'PICKUP'
    },
    {
      id: 'm_fugitive_1',
      title: '🚨 [지명수배 도주] 경찰 포위망 탈출',
      description: '경찰 3성 수배 추격을 피해 45초간 체포당하지 않고 하안사거리를 질주하세요!',
      pickupPos: new THREE.Vector3(0, 0, 0),
      targetPos: new THREE.Vector3(0, 0, 0),
      targetName: '추격 탈출',
      timeLimit: 45,
      reward: 150000,
      stage: 'SURVIVE'
    }
  ];

  private currentPoolIndex = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Create 3D Beacon Marker (GTA style yellow cylinder)
    this.markerMesh = new THREE.Group();

    const cylGeo = new THREE.CylinderGeometry(2.5, 2.5, 12, 16, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0xffbb00,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.markerCylinder = new THREE.Mesh(cylGeo, cylMat);
    this.markerCylinder.position.y = 6;
    this.markerMesh.add(this.markerCylinder);

    const ringGeo = new THREE.RingGeometry(1.8, 2.8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    this.markerRing = new THREE.Mesh(ringGeo, ringMat);
    this.markerRing.rotation.x = -Math.PI / 2;
    this.markerRing.position.y = 0.15;
    this.markerMesh.add(this.markerRing);

    this.markerMesh.visible = false;
    this.scene.add(this.markerMesh);
  }

  public startNextMission(): Mission {
    const template = this.missionPool[this.currentPoolIndex % this.missionPool.length];
    this.currentPoolIndex++;

    this.currentMission = {
      ...template,
      stage: template.stage === 'SURVIVE' ? 'SURVIVE' : 'PICKUP'
    };

    this.remainingTime = this.currentMission.timeLimit;
    this.isMissionActive = true;

    this.updateMarkerPosition();
    return this.currentMission;
  }

  public cancelMission() {
    this.currentMission = null;
    this.isMissionActive = false;
    this.markerMesh.visible = false;
  }

  private updateMarkerPosition() {
    if (!this.currentMission) {
      this.markerMesh.visible = false;
      return;
    }

    if (this.currentMission.stage === 'PICKUP') {
      this.markerMesh.position.copy(this.currentMission.pickupPos);
      this.markerMesh.visible = true;
      (this.markerCylinder.material as THREE.MeshBasicMaterial).color.setHex(0xffaa00);
      (this.markerRing.material as THREE.MeshBasicMaterial).color.setHex(0xffea00);
    } else if (this.currentMission.stage === 'DELIVER') {
      this.markerMesh.position.copy(this.currentMission.targetPos);
      this.markerMesh.visible = true;
      (this.markerCylinder.material as THREE.MeshBasicMaterial).color.setHex(0x00ff88);
      (this.markerRing.material as THREE.MeshBasicMaterial).color.setHex(0x00e1ff);
    } else {
      this.markerMesh.visible = false;
    }
  }

  public update(delta: number, playerPos: THREE.Vector3): { completed: boolean; failed: boolean; message: string; reward: number } {
    if (!this.isMissionActive || !this.currentMission) {
      return { completed: false, failed: false, message: '', reward: 0 };
    }

    // Animate beacon marker
    if (this.markerMesh.visible) {
      this.markerRing.rotation.z += delta * 2;
      const pulse = 1 + Math.sin(Date.now() * 0.006) * 0.15;
      this.markerMesh.scale.set(pulse, 1, pulse);
    }

    // Tick down timer
    this.remainingTime -= delta;
    if (this.remainingTime <= 0) {
      if (this.currentMission.stage === 'SURVIVE') {
        // Survival success!
        const rew = this.currentMission.reward;
        this.cancelMission();
        return { completed: true, failed: false, message: '🎉 경찰 수배 탈출 성공! 보상 지급 완료!', reward: rew };
      } else {
        // Timeout fail
        this.cancelMission();
        return { completed: false, failed: true, message: '⏰ 시간 초과! 배달 실패!', reward: 0 };
      }
    }

    // Check Proximity to current marker
    const distToMarker = playerPos.distanceTo(this.markerMesh.position);

    if (this.currentMission.stage === 'PICKUP') {
      if (distToMarker < 4.2) {
        // Pickup successful! Proceed to delivery
        this.currentMission.stage = 'DELIVER';
        this.updateMarkerPosition();
        soundManager.playCashSound();
        return {
          completed: false,
          failed: false,
          message: `📦 픽업 완료! 목적지: [${this.currentMission.targetName}]로 이동하세요!`,
          reward: 0
        };
      }
    } else if (this.currentMission.stage === 'DELIVER') {
      if (distToMarker < 4.8) {
        // Delivery successful!
        const rew = this.currentMission.reward;
        this.cancelMission();
        return {
          completed: true,
          failed: false,
          message: `✅ 배달 완료! 보상 +₩${rew.toLocaleString()} 획득!`,
          reward: rew
        };
      }
    }

    return { completed: false, failed: false, message: '', reward: 0 };
  }

  public getObjectiveMarkerPos(): THREE.Vector3 | null {
    if (!this.isMissionActive || !this.markerMesh.visible) return null;
    return this.markerMesh.position;
  }
}
