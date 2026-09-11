import * as THREE from "three";
import type { ProjectMedia } from "../types";

const PANEL_H = 200; // canvas height in px

// A small WebGL turntable for a project rendering. With a depth map it builds a
// displaced relief mesh (real parallax as it turns); without one it shows the
// image as a thin rotating slab. Auto-rotates and can be dragged to spin.
export class Turntable {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private group = new THREE.Group();
  private raf = 0;
  private t = 0;
  private dragging = false;
  private lastX = 0;
  private yaw = 0;
  private autoRotate: boolean;
  private mode: "relief" | "slab";
  private ro: ResizeObserver;
  private disposed = false;
  private junk: { dispose(): void }[] = [];

  constructor(private mount: HTMLElement, media: ProjectMedia) {
    this.autoRotate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.mode = media.depthUrl ? "relief" : "slab";

    const w = mount.clientWidth || 320;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(w, PANEL_H);
    mount.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, w / PANEL_H, 0.1, 100);
    this.camera.position.set(0, 0, 3);

    this.scene.add(this.group);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2, 2, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffb14a, 0.5);
    rim.position.set(-3, 1, -2);
    this.scene.add(rim);

    void this.load(media);
    this.bindPointer();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(mount);
    this.raf = requestAnimationFrame(this.tick);
  }

  private async load(media: ProjectMedia): Promise<void> {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const color = await loader.loadAsync(media.colorUrl).catch(() => null);
    if (this.disposed || !color) return;
    color.colorSpace = THREE.SRGBColorSpace;
    this.junk.push(color);

    const img = color.image as HTMLImageElement;
    const aspect = img?.naturalWidth && img?.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5;
    const h = 1.6;
    const w = h * aspect;

    const depth = this.mode === "relief" ? await loader.loadAsync(media.depthUrl!).catch(() => null) : null;
    if (this.disposed) return;

    if (depth) {
      const geo = new THREE.PlaneGeometry(w, h, 240, 240);
      const mat = new THREE.MeshStandardMaterial({
        map: color,
        displacementMap: depth,
        displacementScale: media.displacementScale ?? 0.2,
        roughness: 0.85,
        metalness: 0
      });
      this.junk.push(depth, geo, mat);
      this.group.add(new THREE.Mesh(geo, mat));
    } else {
      // No depth map: show the rendering as a thin slab that can spin fully.
      this.mode = "slab";
      const geo = new THREE.BoxGeometry(w, h, 0.06);
      const front = new THREE.MeshStandardMaterial({ map: color, roughness: 0.8 });
      const edge = new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.9 });
      // Box face order: px, nx, py, ny, pz (front), nz (back).
      this.junk.push(geo, front, edge);
      this.group.add(new THREE.Mesh(geo, [edge, edge, edge, edge, front, edge]));
    }
  }

  private bindPointer(): void {
    const el = this.renderer.domElement;
    el.style.cursor = "grab";
    el.addEventListener("pointerdown", (e: PointerEvent) => {
      this.dragging = true;
      this.lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    });
    el.addEventListener("pointermove", (e: PointerEvent) => {
      if (!this.dragging) return;
      this.yaw += (e.clientX - this.lastX) * 0.01;
      this.lastX = e.clientX;
    });
    const up = () => {
      this.dragging = false;
      el.style.cursor = "grab";
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  private resize(): void {
    if (this.disposed) return;
    const w = this.mount.clientWidth || 320;
    this.renderer.setSize(w, PANEL_H);
    this.camera.aspect = w / PANEL_H;
    this.camera.updateProjectionMatrix();
  }

  private tick = (): void => {
    if (this.disposed) return;
    this.t += 0.016;
    let y = this.yaw;
    if (this.autoRotate && !this.dragging) {
      // Relief has a flat back, so oscillate; a slab can spin all the way round.
      if (this.mode === "relief") y += Math.sin(this.t * 0.5) * 0.5;
      else {
        this.yaw += 0.005;
        y = this.yaw;
      }
    }
    this.group.rotation.y = y;
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    for (const o of this.junk) o.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
