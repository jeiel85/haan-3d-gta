import * as THREE from 'three';

export interface BuildingData {
  mesh: THREE.Group;
  collider: THREE.Box3;
  type: 'commercial' | 'apartment';
  name: string;
}

export class BuildingGenerator {
  private textureCache = new Map<string, THREE.CanvasTexture>();

  /**
   * Generates a dynamic canvas texture for authentic Korean signs in Haan Sageori.
   */
  public createSignboardTexture(
    brand: string,
    subText: string,
    bgColor: string,
    textColor: string,
    accentColor: string,
    width = 512,
    height = 128
  ): THREE.CanvasTexture {
    const key = `${brand}_${subText}_${bgColor}_${textColor}_${accentColor}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Outer border & neon glow
    ctx.lineWidth = 6;
    ctx.strokeStyle = accentColor;
    ctx.strokeRect(3, 3, width - 6, height - 6);

    // Inner subtle gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(255,255,255,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = grad;
    ctx.fillRect(6, 6, width - 12, height - 12);

    // Main Brand Text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 44px "Pretendard", "Apple SD Gothic Neo", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(brand, width / 2, height * 0.42);

    // Subtext (Branch, Phone, Category)
    if (subText) {
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 20px "Pretendard", sans-serif';
      ctx.shadowBlur = 3;
      ctx.fillText(subText, width / 2, height * 0.78);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(key, texture);
    return texture;
  }

  /**
   * Generates a high-rise Korean apartment facade texture (Haan Jugong 1~12 Danji)
   */
  public createApartmentTexture(danjiNumber: number, dongNumber: number): THREE.CanvasTexture {
    const key = `apt_${danjiNumber}_${dongNumber}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Concrete apartment wall base color
    ctx.fillStyle = '#cfd7df';
    ctx.fillRect(0, 0, 512, 1024);

    // Accent color stripe (e.g. orange or teal stripe common on Korean Jugong apartments)
    const stripeColors = ['#e65c00', '#00838f', '#2e7d32', '#1565c0'];
    const accent = stripeColors[danjiNumber % stripeColors.length];
    ctx.fillStyle = accent;
    ctx.fillRect(360, 0, 90, 1024);

    // Large apartment block number (e.g. "하안주공 704")
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${dongNumber}`, 405, 140);
    ctx.font = 'bold 22px "Pretendard", sans-serif';
    ctx.fillText(`하안주공`, 405, 75);
    ctx.fillText(`${danjiNumber}단지`, 405, 100);

    // Balcony grid pattern
    const rows = 18;
    const cols = 4;
    const startX = 30;
    const startY = 180;
    const winW = 65;
    const winH = 36;
    const gapX = 18;
    const gapY = 10;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (winW + gapX);
        const y = startY + r * (winH + gapY);

        // Balcony frame
        ctx.fillStyle = '#68727d';
        ctx.fillRect(x, y, winW, winH);

        // Glass pane (some lit, some dark for realistic night look)
        const isLit = (r * cols + c + danjiNumber) % 3 === 0;
        ctx.fillStyle = isLit ? '#ffea9f' : '#22303c';
        ctx.fillRect(x + 3, y + 3, winW - 6, winH - 6);

        // Railing bars
        ctx.strokeStyle = '#a4b0be';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + winH * 0.6);
        ctx.lineTo(x + winW - 2, y + winH * 0.6);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(key, texture);
    return texture;
  }

  /**
   * Generates a modern Korean commercial building with multiple storefronts and signs.
   */
  public createCommercialBuilding(
    width: number,
    height: number,
    depth: number,
    signs: Array<{ brand: string; sub: string; bg: string; text: string; accent: string }>
  ): THREE.Group {
    const group = new THREE.Group();

    // Main structural block
    const buildingGeo = new THREE.BoxGeometry(width, height, depth);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x3a424e,
      roughness: 0.7,
      metalness: 0.2
    });
    const buildingMesh = new THREE.Mesh(buildingGeo, buildingMat);
    buildingMesh.position.y = height / 2;
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;
    group.add(buildingMesh);

    // Ground floor glass storefront base
    const groundGeo = new THREE.BoxGeometry(width + 0.3, 4.5, depth + 0.3);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a212d,
      roughness: 0.3,
      metalness: 0.8
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = 2.25;
    group.add(groundMesh);

    // Rooftop parapet & HVAC units
    const roofFenceGeo = new THREE.BoxGeometry(width - 0.5, 1.2, depth - 0.5);
    const roofFenceMat = new THREE.MeshStandardMaterial({ color: 0x222730 });
    const roofFence = new THREE.Mesh(roofFenceGeo, roofFenceMat);
    roofFence.position.y = height + 0.6;
    group.add(roofFence);

    // HVAC Box
    const hvacGeo = new THREE.BoxGeometry(width * 0.3, 2.5, depth * 0.3);
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x555d68, metalness: 0.7 });
    const hvac = new THREE.Mesh(hvacGeo, hvacMat);
    hvac.position.set(0, height + 1.25, 0);
    group.add(hvac);

    // Mount glowing signboards on the front facade
    const signH = 3.2;
    const signW = Math.min(width * 0.85, 20);
    const signGeo = new THREE.BoxGeometry(signW, signH, 0.4);

    signs.forEach((s, idx) => {
      const tex = this.createSignboardTexture(s.brand, s.sub, s.bg, s.text, s.accent);
      const signMat = new THREE.MeshStandardMaterial({
        map: tex,
        emissive: new THREE.Color(s.bg),
        emissiveIntensity: 0.35,
        roughness: 0.4
      });

      const signMesh = new THREE.Mesh(signGeo, signMat);
      // Place vertically along the building facade
      const yPos = 4.8 + idx * (signH + 1.2);
      if (yPos < height - 2) {
        signMesh.position.set(0, yPos, depth / 2 + 0.25);
        group.add(signMesh);
      }
    });

    return group;
  }

  /**
   * Generates a high-rise residential apartment block representing Haan Jugong Complex.
   */
  public createApartmentBlock(
    danjiNumber: number,
    dongNumber: number,
    width = 38,
    height = 55,
    depth = 16
  ): THREE.Group {
    const group = new THREE.Group();

    const geo = new THREE.BoxGeometry(width, height, depth);
    const tex = this.createApartmentTexture(danjiNumber, dongNumber);
    tex.repeat.set(1, 1);

    const sideMat = new THREE.MeshStandardMaterial({ color: 0xcfd7df, roughness: 0.8 });
    const frontMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.7,
      emissive: new THREE.Color(0xffea9f),
      emissiveIntensity: 0.15
    });

    // Front & Back face use apartment texture
    const materials = [
      sideMat,   // right
      sideMat,   // left
      sideMat,   // top
      sideMat,   // bottom
      frontMat,  // front
      frontMat   // back
    ];

    const mesh = new THREE.Mesh(geo, materials);
    mesh.position.y = height / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Elevator shaft penthouse on roof
    const roofGeo = new THREE.BoxGeometry(width * 0.25, 4, depth * 0.4);
    const roofMesh = new THREE.Mesh(roofGeo, sideMat);
    roofMesh.position.set(0, height + 2, 0);
    group.add(roofMesh);

    return group;
  }
}
