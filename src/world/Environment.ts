import * as THREE from 'three';

export type TimeWeatherMode = 'DAY' | 'SUNSET' | 'NIGHT' | 'RAIN';

export class Environment {
  public scene: THREE.Scene;
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;

  public currentMode: TimeWeatherMode = 'DAY';

  // Rain particle system
  private rainGeo: THREE.BufferGeometry | null = null;
  private rainSystem: THREE.Points | null = null;
  private rainCount = 1800;
  private rainVelocity: Float32Array | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Ambient
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    // Hemisphere
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Directional Sun / Moon
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(70, 100, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 300;
    this.dirLight.shadow.camera.left = -120;
    this.dirLight.shadow.camera.right = 120;
    this.dirLight.shadow.camera.top = 120;
    this.dirLight.shadow.camera.bottom = -120;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.initRain();
    this.setMode('DAY');
  }

  private initRain() {
    this.rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);
    this.rainVelocity = new Float32Array(this.rainCount);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      this.rainVelocity[i] = 1.2 + Math.random() * 0.8;
    }

    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 0.35,
      transparent: true,
      opacity: 0.7
    });

    this.rainSystem = new THREE.Points(this.rainGeo, rainMat);
    this.rainSystem.visible = false;
    this.scene.add(this.rainSystem);
  }

  public setMode(mode: TimeWeatherMode) {
    this.currentMode = mode;

    switch (mode) {
      case 'DAY':
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.003);
        this.dirLight.color.setHex(0xfff5e6);
        this.dirLight.intensity = 1.3;
        this.dirLight.position.set(70, 100, 50);
        this.hemiLight.color.setHex(0xffffff);
        this.hemiLight.groundColor.setHex(0x556644);
        this.hemiLight.intensity = 0.5;
        this.ambientLight.intensity = 0.4;
        if (this.rainSystem) this.rainSystem.visible = false;
        break;

      case 'SUNSET':
        this.scene.background = new THREE.Color(0xd35400); // Golden sunset
        this.scene.fog = new THREE.FogExp2(0xe67e22, 0.004);
        this.dirLight.color.setHex(0xff8833);
        this.dirLight.intensity = 1.1;
        this.dirLight.position.set(100, 40, 20);
        this.hemiLight.color.setHex(0xffaa66);
        this.hemiLight.groundColor.setHex(0x331122);
        this.hemiLight.intensity = 0.4;
        this.ambientLight.intensity = 0.3;
        if (this.rainSystem) this.rainSystem.visible = false;
        break;

      case 'NIGHT':
        this.scene.background = new THREE.Color(0x0a0e1a); // Indigo night
        this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.0045);
        this.dirLight.color.setHex(0x4466aa); // Moon blue
        this.dirLight.intensity = 0.4;
        this.dirLight.position.set(-50, 80, -50);
        this.hemiLight.color.setHex(0x334466);
        this.hemiLight.groundColor.setHex(0x111625);
        this.hemiLight.intensity = 0.25;
        this.ambientLight.intensity = 0.25;
        if (this.rainSystem) this.rainSystem.visible = false;
        break;

      case 'RAIN':
        this.scene.background = new THREE.Color(0x222a35); // Overcast
        this.scene.fog = new THREE.FogExp2(0x222a35, 0.006);
        this.dirLight.color.setHex(0x778899);
        this.dirLight.intensity = 0.5;
        this.dirLight.position.set(30, 80, 20);
        this.hemiLight.color.setHex(0x445566);
        this.hemiLight.groundColor.setHex(0x1a222a);
        this.hemiLight.intensity = 0.3;
        this.ambientLight.intensity = 0.3;
        if (this.rainSystem) this.rainSystem.visible = true;
        break;
    }
  }

  public cycleMode(): TimeWeatherMode {
    const modes: TimeWeatherMode[] = ['DAY', 'SUNSET', 'NIGHT', 'RAIN'];
    const nextIdx = (modes.indexOf(this.currentMode) + 1) % modes.length;
    this.setMode(modes[nextIdx]);
    return this.currentMode;
  }

  public update(delta: number, focusPos: THREE.Vector3) {
    // Update rain particles around player
    if (this.currentMode === 'RAIN' && this.rainGeo && this.rainVelocity) {
      const posAttr = this.rainGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < this.rainCount; i++) {
        arr[i * 3 + 1] -= this.rainVelocity[i] * delta * 45;

        // Reset to top when hit ground
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3] = focusPos.x + (Math.random() - 0.5) * 150;
          arr[i * 3 + 1] = 50 + Math.random() * 20;
          arr[i * 3 + 2] = focusPos.z + (Math.random() - 0.5) * 150;
        }
      }
      posAttr.needsUpdate = true;
    }
  }
}
