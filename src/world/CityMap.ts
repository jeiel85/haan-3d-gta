import * as THREE from 'three';
import { BuildingGenerator, BuildingData } from './BuildingGenerator';

export interface CollectibleItem {
  mesh: THREE.Group;
  type: 'coin' | 'bribe';
  position: THREE.Vector3;
  collected: boolean;
  value: number;
}

export interface TrafficLight {
  mesh: THREE.Group;
  redLight: THREE.Mesh;
  yellowLight: THREE.Mesh;
  greenLight: THREE.Mesh;
  state: 'RED' | 'YELLOW' | 'GREEN';
  direction: 'NS' | 'EW';
}

export class CityMap {
  public scene: THREE.Scene;
  public colliders: THREE.Box3[] = [];
  public buildings: BuildingData[] = [];
  public collectibles: CollectibleItem[] = [];
  public trafficLights: TrafficLight[] = [];

  private buildingGen = new BuildingGenerator();
  private trafficTimer = 0;
  private currentLightState: 'NS_GREEN' | 'NS_YELLOW' | 'EW_GREEN' | 'EW_YELLOW' = 'NS_GREEN';

  // Road configuration
  public readonly ROAD_WIDTH = 26; // 6 lanes
  public readonly MAP_SIZE = 450;  // Total playable city bounds (-225 to +225)

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initMap();
  }

  private initMap() {
    this.createGroundAndRoads();
    this.createIntersectionsAndCrosswalks();
    this.createSidewalksAndProps();
    this.createBuildings();
    this.createApartmentSuburbs();
    this.createStuntRampsAndCollectibles();
  }

  /**
   * Builds the ground terrain and 6-lane asphalt roads (Ori-ro & Haan-ro)
   */
  private createGroundAndRoads() {
    // Base terrain (grass / ground outside roads)
    const groundGeo = new THREE.PlaneGeometry(this.MAP_SIZE, this.MAP_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x242c26,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Asphalt Material
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1f232a,
      roughness: 0.85,
      metalness: 0.15
    });

    // North-South Road: Ori-ro (오리로)
    const nsRoadGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH, this.MAP_SIZE);
    const nsRoad = new THREE.Mesh(nsRoadGeo, asphaltMat);
    nsRoad.rotation.x = -Math.PI / 2;
    nsRoad.position.y = 0.02;
    nsRoad.receiveShadow = true;
    this.scene.add(nsRoad);

    // East-West Road: Haan-ro (하안로)
    const ewRoadGeo = new THREE.PlaneGeometry(this.MAP_SIZE, this.ROAD_WIDTH);
    const ewRoad = new THREE.Mesh(ewRoadGeo, asphaltMat);
    ewRoad.rotation.x = -Math.PI / 2;
    ewRoad.position.y = 0.02;
    ewRoad.receiveShadow = true;
    this.scene.add(ewRoad);

    // Lane Markings
    this.createLaneMarkings();
  }

  private createLaneMarkings() {
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });

    // Double yellow center divider for North-South road
    const doubleYellow1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, this.MAP_SIZE), yellowMat);
    doubleYellow1.rotation.x = -Math.PI / 2;
    doubleYellow1.position.set(-0.35, 0.04, 0);
    this.scene.add(doubleYellow1);

    const doubleYellow2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, this.MAP_SIZE), yellowMat);
    doubleYellow2.rotation.x = -Math.PI / 2;
    doubleYellow2.position.set(0.35, 0.04, 0);
    this.scene.add(doubleYellow2);

    // Double yellow center divider for East-West road
    const ewYellow1 = new THREE.Mesh(new THREE.PlaneGeometry(this.MAP_SIZE, 0.3), yellowMat);
    ewYellow1.rotation.x = -Math.PI / 2;
    ewYellow1.position.set(0, 0.04, -0.35);
    this.scene.add(ewYellow1);

    const ewYellow2 = new THREE.Mesh(new THREE.PlaneGeometry(this.MAP_SIZE, 0.3), yellowMat);
    ewYellow2.rotation.x = -Math.PI / 2;
    ewYellow2.position.set(0, 0.04, 0.35);
    this.scene.add(ewYellow2);

    // White dashed lane dividers (3 lanes on each side)
    const laneOffsets = [-8.5, -4.2, 4.2, 8.5];
    laneOffsets.forEach(off => {
      // NS dashed lines
      for (let z = -this.MAP_SIZE / 2 + 10; z < this.MAP_SIZE / 2 - 10; z += 12) {
        if (Math.abs(z) < this.ROAD_WIDTH / 2 + 6) continue; // skip intersection
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 6), whiteMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(off, 0.04, z);
        this.scene.add(dash);
      }

      // EW dashed lines
      for (let x = -this.MAP_SIZE / 2 + 10; x < this.MAP_SIZE / 2 - 10; x += 12) {
        if (Math.abs(x) < this.ROAD_WIDTH / 2 + 6) continue;
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.22), whiteMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.04, off);
        this.scene.add(dash);
      }
    });
  }

  /**
   * Constructs the 4 crosswalks (zebra stripes) and stop lines at Haan Sageori
   */
  private createIntersectionsAndCrosswalks() {
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const crosswalkDist = this.ROAD_WIDTH / 2 + 3.5;
    const stripeW = 0.9;
    const stripeL = 5.0;
    const stripeCount = 18;

    // North & South Crosswalks
    [-crosswalkDist, crosswalkDist].forEach(zPos => {
      const group = new THREE.Group();
      for (let i = -stripeCount / 2; i <= stripeCount / 2; i++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(stripeW, stripeL), whiteMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(i * 1.3, 0.05, zPos);
        group.add(stripe);
      }
      this.scene.add(group);
    });

    // East & West Crosswalks
    [-crosswalkDist, crosswalkDist].forEach(xPos => {
      const group = new THREE.Group();
      for (let i = -stripeCount / 2; i <= stripeCount / 2; i++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(stripeL, stripeW), whiteMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(xPos, 0.05, i * 1.3);
        group.add(stripe);
      }
      this.scene.add(group);
    });

    // Stop lines
    const stopOffset = this.ROAD_WIDTH / 2 + 8.5;
    const stopLineNS1 = new THREE.Mesh(new THREE.PlaneGeometry(this.ROAD_WIDTH * 0.45, 0.8), whiteMat);
    stopLineNS1.rotation.x = -Math.PI / 2;
    stopLineNS1.position.set(6.5, 0.05, stopOffset);
    this.scene.add(stopLineNS1);

    const stopLineNS2 = new THREE.Mesh(new THREE.PlaneGeometry(this.ROAD_WIDTH * 0.45, 0.8), whiteMat);
    stopLineNS2.rotation.x = -Math.PI / 2;
    stopLineNS2.position.set(-6.5, 0.05, -stopOffset);
    this.scene.add(stopLineNS2);

    // Intersection traffic lights at the 4 corners
    this.createTrafficLight(-this.ROAD_WIDTH / 2 - 2, -this.ROAD_WIDTH / 2 - 2, 'NS', 0);
    this.createTrafficLight(this.ROAD_WIDTH / 2 + 2, -this.ROAD_WIDTH / 2 - 2, 'EW', Math.PI / 2);
    this.createTrafficLight(this.ROAD_WIDTH / 2 + 2, this.ROAD_WIDTH / 2 + 2, 'NS', Math.PI);
    this.createTrafficLight(-this.ROAD_WIDTH / 2 - 2, this.ROAD_WIDTH / 2 + 2, 'EW', -Math.PI / 2);
  }

  private createTrafficLight(x: number, z: number, dir: 'NS' | 'EW', rotY: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.2, 0.25, 7.5);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x333b45, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 3.75;
    group.add(pole);

    // Overhanging arm
    const armGeo = new THREE.BoxGeometry(0.2, 0.2, 6);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0, 7.2, 3);
    group.add(arm);

    // Traffic Signal Box
    const boxGeo = new THREE.BoxGeometry(0.6, 1.8, 0.5);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x111317 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 6.2, 4.5);
    group.add(box);

    // Red, Yellow, Green Light Lenses
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0x332200 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x003311 });

    const lensGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const redLight = new THREE.Mesh(lensGeo, redMat);
    redLight.position.set(0, 6.8, 4.75);
    group.add(redLight);

    const yellowLight = new THREE.Mesh(lensGeo, yellowMat);
    yellowLight.position.set(0, 6.2, 4.75);
    group.add(yellowLight);

    const greenLight = new THREE.Mesh(lensGeo, greenMat);
    greenLight.position.set(0, 5.6, 4.75);
    group.add(greenLight);

    this.scene.add(group);

    this.trafficLights.push({
      mesh: group,
      redLight,
      yellowLight,
      greenLight,
      state: 'RED',
      direction: dir
    });

    // Collider for the pole
    const collider = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, 3.5, z),
      new THREE.Vector3(1, 7.5, 1)
    );
    this.colliders.push(collider);
  }

  /**
   * Builds sidewalk platforms, Korean bus shelters, guardrails and street trees
   */
  private createSidewalksAndProps() {
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x7b8594,
      roughness: 0.9
    });

    // 4 Corner Sidewalk Plazas
    const cornerSize = (this.MAP_SIZE - this.ROAD_WIDTH) / 2;
    const halfRoad = this.ROAD_WIDTH / 2;

    const corners = [
      { x: halfRoad + cornerSize / 2, z: halfRoad + cornerSize / 2 },
      { x: -halfRoad - cornerSize / 2, z: halfRoad + cornerSize / 2 },
      { x: halfRoad + cornerSize / 2, z: -halfRoad - cornerSize / 2 },
      { x: -halfRoad - cornerSize / 2, z: -halfRoad - cornerSize / 2 }
    ];

    corners.forEach(c => {
      const sidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(cornerSize, 0.25, cornerSize),
        sidewalkMat
      );
      sidewalk.position.set(c.x, 0.125, c.z);
      sidewalk.receiveShadow = true;
      this.scene.add(sidewalk);
    });

    // Street Lamps along roads
    for (let pos = -180; pos <= 180; pos += 35) {
      if (Math.abs(pos) < halfRoad + 10) continue;
      this.createStreetLamp(halfRoad + 2.5, pos);
      this.createStreetLamp(-halfRoad - 2.5, pos);
      this.createStreetLamp(pos, halfRoad + 2.5);
      this.createStreetLamp(pos, -halfRoad - 2.5);

      // Ginkgo trees along the sidewalk
      this.createStreetTree(halfRoad + 5.5, pos);
      this.createStreetTree(-halfRoad - 5.5, pos);
      this.createStreetTree(pos, halfRoad + 5.5);
      this.createStreetTree(pos, -halfRoad - 5.5);
    }

    // Haan Bus Stop Shelters ("하안사거리 정류장")
    this.createBusShelter(halfRoad + 2.2, 28, 0);
    this.createBusShelter(-halfRoad - 2.2, -28, Math.PI);
  }

  private createStreetLamp(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 7),
      new THREE.MeshStandardMaterial({ color: 0x222a35, metalness: 0.9 })
    );
    pole.position.y = 3.5;
    group.add(pole);

    // Lamp head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.25, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x11161d })
    );
    head.position.set(0, 7, 0.4);
    group.add(head);

    // Emissive bulb
    const bulb = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.1, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffeebb })
    );
    bulb.position.set(0, 6.85, 0.4);
    group.add(bulb);

    this.scene.add(group);

    const collider = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, 3.5, z),
      new THREE.Vector3(0.6, 7, 0.6)
    );
    this.colliders.push(collider);
  }

  private createStreetTree(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 3),
      new THREE.MeshStandardMaterial({ color: 0x4a321f, roughness: 0.9 })
    );
    trunk.position.y = 1.5;
    group.add(trunk);

    // Ginkgo / Green Leaf Canopy
    const leafMat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.4 ? 0x2e7d32 : 0xebb434, // mix of green and golden autumn ginkgo
      roughness: 0.8
    });

    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 1), leafMat);
    canopy.position.y = 4.2;
    canopy.castShadow = true;
    group.add(canopy);

    this.scene.add(group);

    const collider = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, 2, z),
      new THREE.Vector3(1.2, 4, 1.2)
    );
    this.colliders.push(collider);
  }

  private createBusShelter(x: number, z: number, rotY: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    // Metal Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a2b3c, metalness: 0.85 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 7.5), frameMat);
    roof.position.set(0, 3.2, 0);
    group.add(roof);

    // Glass Back Wall
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transmission: 0.85,
      opacity: 0.6,
      transparent: true,
      roughness: 0.1
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.9, 7.2), glassMat);
    backWall.position.set(1.4, 1.6, 0);
    group.add(backWall);

    // Bus Stop Signboard ("하안사거리 중앙정류장")
    const signTex = this.buildingGen.createSignboardTexture(
      '하안사거리 정류장',
      '광명시내·철산역·서울 방면',
      '#004488',
      '#ffffff',
      '#00d2ff',
      512,
      128
    );
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.8, 4),
      new THREE.MeshStandardMaterial({ map: signTex })
    );
    sign.position.set(1.3, 2.7, 0);
    group.add(sign);

    // Bench
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x5a3d28 })
    );
    bench.position.set(0.8, 0.45, 0);
    group.add(bench);

    this.scene.add(group);

    const collider = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, 1.8, z),
      new THREE.Vector3(3.5, 3.5, 8)
    );
    this.colliders.push(collider);
  }

  /**
   * Spawns core commercial buildings at the 4 intersection quadrants with authentic Korean signboards
   */
  private createBuildings() {
    // 1. North-East Corner: "하안 골든타워 & 학원가"
    const neBuilding = this.buildingGen.createCommercialBuilding(34, 42, 34, [
      { brand: 'KB국민은행', sub: '하안사거리 종합금융센터', bg: '#ffbb00', text: '#332200', accent: '#ffffff' },
      { brand: '하안 대성입시학원', sub: '초중고 수능·내신 완벽대비', bg: '#002244', text: '#ffffff', accent: '#00d2ff' },
      { brand: '눈높이 러닝센터', sub: '하안사거리 교육원', bg: '#dd2222', text: '#ffffff', accent: '#ffea70' },
      { brand: '다이소 하안점', sub: '국민가게 DAISO', bg: '#d6001c', text: '#ffffff', accent: '#ffffff' },
      { brand: '온누리 대형약국', sub: '연중무휴 처방조제', bg: '#008855', text: '#ffffff', accent: '#ffffff' }
    ]);
    neBuilding.position.set(38, 0, 38);
    this.addBuildingWithCollider(neBuilding, 38, 0, 38, 34, 42, 34, 'commercial', '하안 골든타워');

    // 2. North-West Corner: "하안 프라자 (올리브영 & 카페 & 엔터)"
    const nwBuilding = this.buildingGen.createCommercialBuilding(36, 38, 32, [
      { brand: '올리브영', sub: 'OLIVE YOUNG 하안사거리점', bg: '#88c057', text: '#113311', accent: '#ffffff' },
      { brand: '파리바게뜨', sub: 'PARIS BAGUETTE 하안점', bg: '#002f6c', text: '#ffffff', accent: '#00a0e9' },
      { brand: '배스킨라빈스', sub: 'baskin robbins 31', bg: '#ff3388', text: '#ffffff', accent: '#0066cc' },
      { brand: '24시 코인노래방', sub: '최신 음향시설 완비 TJ미디어', bg: '#660099', text: '#ffff00', accent: '#ff00aa' },
      { brand: '긱스타 PC CAFE', sub: 'RTX 4080 전좌석 수냉식 PC', bg: '#111111', text: '#00ffcc', accent: '#ff3300' }
    ]);
    nwBuilding.position.set(-40, 0, 38);
    this.addBuildingWithCollider(nwBuilding, -40, 0, 38, 36, 38, 32, 'commercial', '하안 프라자');

    // 3. South-East Corner: "하안 메디컬 스퀘어"
    const seBuilding = this.buildingGen.createCommercialBuilding(32, 45, 34, [
      { brand: '신한은행', sub: 'SHINHAN BANK 하안지점', bg: '#0046ff', text: '#ffffff', accent: '#ffdd00' },
      { brand: '메가MGC커피', sub: '빅사이즈 2샷 하안사거리점', bg: '#ffcc00', text: '#111111', accent: '#ffffff' },
      { brand: '하안탑 수학전문학원', sub: '1:1 맞춤 클리닉 지도', bg: '#1a1a2e', text: '#ffffff', accent: '#ff9900' },
      { brand: '하안 이비인후과·내과', sub: '전문의 3인 진료', bg: '#00838f', text: '#ffffff', accent: '#ffffff' }
    ]);
    seBuilding.position.set(38, 0, -40);
    this.addBuildingWithCollider(seBuilding, 38, 0, -40, 32, 45, 34, 'commercial', '하안 메디컬 스퀘어');

    // 4. South-West Corner: "하안 커머셜 타워"
    const swBuilding = this.buildingGen.createCommercialBuilding(35, 40, 35, [
      { brand: '우리은행', sub: 'WOORI BANK 하안동금융센터', bg: '#0067ac', text: '#ffffff', accent: '#ffffff' },
      { brand: '하나은행', sub: 'Hana Bank 하안사거리점', bg: '#008485', text: '#ffffff', accent: '#ff0033' },
      { brand: '롯데리아', sub: 'LOTTERIA 하안사거리점', bg: '#ed1c24', text: '#ffffff', accent: '#ffc600' },
      { brand: '써브웨이', sub: 'SUBWAY Fresh Eat', bg: '#008a00', text: '#ffc200', accent: '#ffffff' }
    ]);
    swBuilding.position.set(-40, 0, -40);
    this.addBuildingWithCollider(swBuilding, -40, 0, -40, 35, 40, 35, 'commercial', '하안 커머셜 타워');
  }

  /**
   * Spawns surrounding residential high-rises (Haan Jugong 7, 8, 10, 12 Danji)
   */
  private createApartmentSuburbs() {
    const aptConfigs = [
      // Danji 7 (North East suburb)
      { danji: 7, dong: 701, x: 95, z: 80, rot: 0 },
      { danji: 7, dong: 704, x: 95, z: 135, rot: 0 },
      { danji: 7, dong: 708, x: 150, z: 80, rot: Math.PI / 2 },
      { danji: 7, dong: 712, x: 150, z: 135, rot: Math.PI / 2 },

      // Danji 8 (North West suburb)
      { danji: 8, dong: 801, x: -95, z: 80, rot: 0 },
      { danji: 8, dong: 803, x: -95, z: 135, rot: 0 },
      { danji: 8, dong: 807, x: -150, z: 80, rot: Math.PI / 2 },
      { danji: 8, dong: 810, x: -150, z: 135, rot: Math.PI / 2 },

      // Danji 10 (South East suburb)
      { danji: 10, dong: 1002, x: 95, z: -85, rot: 0 },
      { danji: 10, dong: 1005, x: 95, z: -140, rot: 0 },
      { danji: 10, dong: 1008, x: 150, z: -85, rot: Math.PI / 2 },

      // Danji 12 (South West suburb)
      { danji: 12, dong: 1201, x: -95, z: -85, rot: 0 },
      { danji: 12, dong: 1204, x: -95, z: -140, rot: 0 },
      { danji: 12, dong: 1209, x: -150, z: -85, rot: Math.PI / 2 }
    ];

    aptConfigs.forEach(cfg => {
      const apt = this.buildingGen.createApartmentBlock(cfg.danji, cfg.dong, 36, 52, 15);
      apt.position.set(cfg.x, 0, cfg.z);
      apt.rotation.y = cfg.rot;
      this.addBuildingWithCollider(
        apt,
        cfg.x,
        0,
        cfg.z,
        cfg.rot === 0 ? 36 : 15,
        52,
        cfg.rot === 0 ? 15 : 36,
        'apartment',
        `하안주공 ${cfg.danji}단지 ${cfg.dong}동`
      );
    });
  }

  private addBuildingWithCollider(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    type: 'commercial' | 'apartment',
    name: string
  ) {
    this.scene.add(group);
    const collider = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, y + h / 2, z),
      new THREE.Vector3(w, h, d)
    );
    this.colliders.push(collider);
    this.buildings.push({ mesh: group, collider, type, name });
  }

  /**
   * Adds stunt jump ramps and glowing collectible tokens (Coins & Bribe stars)
   */
  private createStuntRampsAndCollectibles() {
    // Stunt Ramp 1: Near Jugong 7
    this.createStuntRamp(25, 75, 0);
    // Stunt Ramp 2: Near Jugong 8
    this.createStuntRamp(-75, 25, Math.PI / 2);
    // Stunt Ramp 3: Near Jugong 12
    this.createStuntRamp(-25, -75, Math.PI);

    // Collectible Golden Haan Coins (+₩10,000)
    const coinLocations = [
      new THREE.Vector3(0, 1.2, 0),       // Center of crossroad
      new THREE.Vector3(25, 4.5, 75),    // At top of stunt ramp 1
      new THREE.Vector3(-75, 4.5, 25),   // At top of stunt ramp 2
      new THREE.Vector3(45, 1.2, 55),    // In front of KB Bank
      new THREE.Vector3(-45, 1.2, 55),   // In front of Olive Young
      new THREE.Vector3(45, 1.2, -55),   // In front of Mega Coffee
      new THREE.Vector3(-45, 1.2, -55),  // In front of Woori Bank
      new THREE.Vector3(120, 1.2, 100),  // Jugong 7 park
      new THREE.Vector3(-120, 1.2, 100)  // Jugong 8 playground
    ];

    coinLocations.forEach(pos => {
      this.createCoin(pos);
    });

    // Bribe Stars (-1 Wanted Star)
    const bribeLocations = [
      new THREE.Vector3(70, 1.5, 30),
      new THREE.Vector3(-70, 1.5, -30),
      new THREE.Vector3(30, 1.5, -70),
      new THREE.Vector3(-30, 1.5, 70)
    ];

    bribeLocations.forEach(pos => {
      this.createBribeStar(pos);
    });
  }

  private createStuntRamp(x: number, z: number, rotY: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    // Wedge ramp geometry
    const rampW = 8;
    const rampH = 2.8;
    const rampL = 10;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(rampL, 0);
    shape.lineTo(rampL, rampH);
    shape.closePath();

    const extrudeSettings = { depth: rampW, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.5,
      metalness: 0.6
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(-rampL / 2, 0, -rampW / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    this.scene.add(group);
  }

  private createCoin(pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    const geo = new THREE.CylinderGeometry(0.7, 0.7, 0.15, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xffaa00,
      emissiveIntensity: 0.4
    });

    const coinMesh = new THREE.Mesh(geo, mat);
    coinMesh.rotation.z = Math.PI / 2;
    group.add(coinMesh);

    this.scene.add(group);
    this.collectibles.push({
      mesh: group,
      type: 'coin',
      position: pos,
      collected: false,
      value: 10000
    });
  }

  private createBribeStar(pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // 5-point star
    const starGeo = new THREE.OctahedronGeometry(0.7, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0x00e1ff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0088ff,
      emissiveIntensity: 0.6
    });

    const starMesh = new THREE.Mesh(starGeo, starMat);
    group.add(starMesh);

    this.scene.add(group);
    this.collectibles.push({
      mesh: group,
      type: 'bribe',
      position: pos,
      collected: false,
      value: 1
    });
  }

  /**
   * Updates traffic light cycles and animates spinning collectibles
   */
  public update(delta: number) {
    // 1. Animate Collectibles
    this.collectibles.forEach(col => {
      if (!col.collected) {
        col.mesh.rotation.y += delta * 2.5;
        col.mesh.position.y = col.position.y + Math.sin(Date.now() * 0.004) * 0.15;
      }
    });

    // 2. Traffic Light cycle (every 14 seconds)
    this.trafficTimer += delta;
    if (this.trafficTimer > 14) {
      this.trafficTimer = 0;
      if (this.currentLightState === 'NS_GREEN') {
        this.currentLightState = 'NS_YELLOW';
      } else if (this.currentLightState === 'NS_YELLOW') {
        this.currentLightState = 'EW_GREEN';
      } else if (this.currentLightState === 'EW_GREEN') {
        this.currentLightState = 'EW_YELLOW';
      } else {
        this.currentLightState = 'NS_GREEN';
      }
      this.applyTrafficLights();
    }
  }

  private applyTrafficLights() {
    const onRed = 0xff1111;
    const onYellow = 0xffcc00;
    const onGreen = 0x00ff66;
    const off = 0x222222;

    this.trafficLights.forEach(tl => {
      const isNS = tl.direction === 'NS';
      let state: 'RED' | 'YELLOW' | 'GREEN' = 'RED';

      if (isNS) {
        if (this.currentLightState === 'NS_GREEN') state = 'GREEN';
        else if (this.currentLightState === 'NS_YELLOW') state = 'YELLOW';
        else state = 'RED';
      } else {
        if (this.currentLightState === 'EW_GREEN') state = 'GREEN';
        else if (this.currentLightState === 'EW_YELLOW') state = 'YELLOW';
        else state = 'RED';
      }

      tl.state = state;
      (tl.redLight.material as THREE.MeshBasicMaterial).color.setHex(state === 'RED' ? onRed : off);
      (tl.yellowLight.material as THREE.MeshBasicMaterial).color.setHex(state === 'YELLOW' ? onYellow : off);
      (tl.greenLight.material as THREE.MeshBasicMaterial).color.setHex(state === 'GREEN' ? onGreen : off);
    });
  }

  public getTrafficSignalForLane(isNorthSouth: boolean): 'RED' | 'YELLOW' | 'GREEN' {
    if (isNorthSouth) {
      if (this.currentLightState === 'NS_GREEN') return 'GREEN';
      if (this.currentLightState === 'NS_YELLOW') return 'YELLOW';
      return 'RED';
    } else {
      if (this.currentLightState === 'EW_GREEN') return 'GREEN';
      if (this.currentLightState === 'EW_YELLOW') return 'YELLOW';
      return 'RED';
    }
  }
}
