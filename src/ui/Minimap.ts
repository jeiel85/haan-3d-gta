import * as THREE from 'three';
import { Vehicle } from '../entities/Vehicle';
import { CityMap } from '../world/CityMap';

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cityMap: CityMap;

  private readonly ZOOM = 0.85; // pixels per world meter

  constructor(canvasId: string, cityMap: CityMap) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.cityMap = cityMap;
  }

  public render(
    playerPos: THREE.Vector3,
    playerHeading: number,
    vehicles: Vehicle[],
    policeCars: Vehicle[],
    missionMarkerPos: THREE.Vector3 | null
  ) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2;

    ctx.clearRect(0, 0, w, h);

    // Circular radar clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    // Dark Radar background
    ctx.fillStyle = '#0f1722';
    ctx.fillRect(0, 0, w, h);

    // Transform world to radar coordinates centered on player
    ctx.translate(cx, cy);
    ctx.rotate(-playerHeading); // rotate map so player always points UP

    // 1. Draw Roads (Ori-ro & Haan-ro)
    const roadW = this.cityMap.ROAD_WIDTH * this.ZOOM;
    const mapExtent = 300 * this.ZOOM;

    ctx.fillStyle = '#1e2836';
    // North-South Road
    ctx.fillRect(
      (-playerPos.x) * this.ZOOM - roadW / 2,
      (-playerPos.z - 200) * this.ZOOM,
      roadW,
      mapExtent * 2
    );
    // East-West Road
    ctx.fillRect(
      (-playerPos.x - 200) * this.ZOOM,
      (-playerPos.z) * this.ZOOM - roadW / 2,
      mapExtent * 2,
      roadW
    );

    // Yellow Center Dividers
    ctx.strokeStyle = '#e6b800';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // NS divider
    ctx.moveTo((-playerPos.x) * this.ZOOM, (-playerPos.z - 200) * this.ZOOM);
    ctx.lineTo((-playerPos.x) * this.ZOOM, (-playerPos.z + 200) * this.ZOOM);
    // EW divider
    ctx.moveTo((-playerPos.x - 200) * this.ZOOM, (-playerPos.z) * this.ZOOM);
    ctx.lineTo((-playerPos.x + 200) * this.ZOOM, (-playerPos.z) * this.ZOOM);
    ctx.stroke();

    // 2. Draw Building Footprints
    ctx.fillStyle = '#2d3b4d';
    this.cityMap.buildings.forEach(b => {
      const min = b.collider.min;
      const max = b.collider.max;
      const bw = (max.x - min.x) * this.ZOOM;
      const bd = (max.z - min.z) * this.ZOOM;
      const bx = (min.x - playerPos.x) * this.ZOOM;
      const bz = (min.z - playerPos.z) * this.ZOOM;

      ctx.fillRect(bx, bz, bw, bd);
    });

    // 3. Draw Collectibles
    this.cityMap.collectibles.forEach(col => {
      if (!col.collected) {
        const dx = (col.position.x - playerPos.x) * this.ZOOM;
        const dz = (col.position.z - playerPos.z) * this.ZOOM;
        ctx.fillStyle = col.type === 'coin' ? '#ffd700' : '#00e1ff';
        ctx.beginPath();
        ctx.arc(dx, dz, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 4. Draw Traffic Vehicles
    ctx.fillStyle = '#81ecec';
    vehicles.forEach(v => {
      if (v.isPlayerDriving) return;
      const dx = (v.position.x - playerPos.x) * this.ZOOM;
      const dz = (v.position.z - playerPos.z) * this.ZOOM;

      ctx.save();
      ctx.translate(dx, dz);
      ctx.rotate(v.heading);
      ctx.fillRect(-2, -4, 4, 8);
      ctx.restore();
    });

    // 5. Draw Police Cars (Flashing Red/Blue)
    policeCars.forEach(cop => {
      const dx = (cop.position.x - playerPos.x) * this.ZOOM;
      const dz = (cop.position.z - playerPos.z) * this.ZOOM;
      const isRed = Math.floor(Date.now() / 200) % 2 === 0;

      ctx.fillStyle = isRed ? '#ff3838' : '#18dcff';
      ctx.beginPath();
      ctx.arc(dx, dz, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Draw Mission Objective Marker (Pulsing Yellow/Green)
    if (missionMarkerPos) {
      const dx = (missionMarkerPos.x - playerPos.x) * this.ZOOM;
      const dz = (missionMarkerPos.z - playerPos.z) * this.ZOOM;
      const pulse = 6 + Math.sin(Date.now() * 0.008) * 2;

      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(dx, dz, pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore(); // restore clipping and translation

    // 7. Draw Player Marker (Centered Chevron pointing UP)
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = '#00ff88';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
