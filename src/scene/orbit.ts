import type SceneView from "@arcgis/core/views/SceneView";

/**
 * Auto-orbit around a fixed pivot. Callers stop() before a goTo, setCenter() to
 * the new pivot, then start() again. A `busy` flag keeps per-frame goTo calls
 * from stacking up, and user pointer/wheel input pauses the orbit for a few
 * seconds.
 */
export class Orbit {
  private raf = 0;
  private running = false;
  private paused = false;
  private resumeAt = 0;
  private busy = false;
  private speed = 4; // deg/sec
  private center: number[] | null = null;
  private lockScale = 0; // pinned on start so zoom can't drift
  private lockTilt = 60;

  constructor(private view: SceneView) {
    const el = view.container as HTMLElement | null;
    if (el) {
      el.addEventListener("pointerdown", () => { this.paused = true; this.resumeAt = 0; });
      el.addEventListener("pointerup", () => { this.resumeAt = performance.now() + 3000; });
      el.addEventListener("wheel", () => { this.paused = true; this.resumeAt = performance.now() + 3000; }, { passive: true });
    }
  }

  setCenter(c: number[]): void {
    this.center = c;
  }
  setSpeed(degPerSec: number): void {
    this.speed = degPerSec;
  }

  // Snapshot scale + tilt as the fixed orbit radius.
  private lock(): void {
    this.lockScale = this.view.scale;
    this.lockTilt = this.view.camera.tilt;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.busy = false;
    this.lock();
    let last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (this.paused && this.resumeAt && now > this.resumeAt) {
        this.paused = false;
        this.resumeAt = 0;
        this.lock(); // keep wherever the user left the zoom/tilt
      }
      if (!this.paused && !this.busy && !this.view.interacting && this.center) {
        this.busy = true;
        const heading = this.view.camera.heading + this.speed * dt;
        // Pin scale + tilt so only heading changes.
        this.view
          .goTo({ heading, center: this.center, scale: this.lockScale, tilt: this.lockTilt }, { animate: false })
          .then(() => { this.busy = false; })
          .catch(() => { this.busy = false; });
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    this.busy = false;
    cancelAnimationFrame(this.raf);
  }
}
