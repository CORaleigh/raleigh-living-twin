import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { ProjectMedia } from "../types";

const PANEL_H = 200; // canvas height in px

// Reject if a promise doesn't settle in time, so a bad model can't hang the load.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

// A small WebGL turntable for a project. Shows a GLB model if there is one;
// otherwise a depth-displaced relief mesh (with a depth map) or a thin slab of
// the rendering. Auto-rotates and can be dragged to spin.
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
  private mode: "model" | "relief" | "slab";
  private ro: ResizeObserver;
  private disposed = false;
  private envTex?: THREE.Texture;
  private junk: { dispose(): void }[] = [];

  // onEmpty fires if neither a model nor an image could be loaded (e.g. the
  // asset isn't in this build) so the caller can show a placeholder.
  constructor(private mount: HTMLElement, media: ProjectMedia, private onEmpty?: () => void) {
    this.autoRotate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.mode = media.modelUrl ? "model" : media.depthUrl ? "relief" : "slab";

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

    // Image-based lighting so PBR (Meshy) materials aren't rendered black.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTex;
    pmrem.dispose();

    void this.load(media);
    this.bindPointer();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(mount);
    this.raf = requestAnimationFrame(this.tick);
  }

  private async load(media: ProjectMedia): Promise<void> {
    let ok = false;
    if (media.modelUrl) ok = await this.loadModel(media.modelUrl);
    if (!ok && !this.disposed) {
      // No model (or it failed): fall back to the image.
      this.mode = media.depthUrl ? "relief" : "slab";
      ok = await this.loadImage(media);
    }
    if (!ok && !this.disposed) {
      cancelAnimationFrame(this.raf); // nothing to draw; stop the loop
      this.onEmpty?.();
    }
  }

  private async loadModel(url: string): Promise<boolean> {
    const loader = new GLTFLoader();
    // Decode Draco-compressed GLBs (Meshy exports these). Decoder is hosted.
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);

    const gltf = await withTimeout(loader.loadAsync(url), 12000).catch((e) => {
      console.warn("[turntable] model load failed, falling back to image:", e);
      return null;
    });
    draco.dispose();
    if (this.disposed || !gltf) return false;

    const root = gltf.scene;
    // Scale so its largest dimension fits the frame, THEN recenter using the
    // post-scale bounds (scaling first avoids shoving an off-center model away).
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    root.scale.setScalar(1.9 / (Math.max(size.x, size.y, size.z) || 1));
    root.updateMatrixWorld(true);
    const center = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
    root.position.sub(center);
    this.group.add(root);
    console.log("[turntable] model loaded", { x: size.x, y: size.y, z: size.z });

    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) this.junk.push(mesh.geometry);
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => this.junk.push(m));
      else if (mat) this.junk.push(mat);
    });
    return true;
  }

  private async loadImage(media: ProjectMedia): Promise<boolean> {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const color = await loader.loadAsync(media.colorUrl).catch(() => null);
    if (this.disposed || !color) return false;
    color.colorSpace = THREE.SRGBColorSpace;
    this.junk.push(color);

    const img = color.image as HTMLImageElement;
    const aspect = img?.naturalWidth && img?.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5;
    const h = 1.6;
    const w = h * aspect;

    const depth = this.mode === "relief" ? await loader.loadAsync(media.depthUrl!).catch(() => null) : null;
    if (this.disposed) return false;

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
    return true;
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
    this.envTex?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
