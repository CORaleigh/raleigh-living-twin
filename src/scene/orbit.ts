import type SceneView from "@arcgis/core/views/SceneView";

/**
 * Slow auto-orbit around a FIXED pivot (not the live view center — that fights
 * programmatic goTo). Callers stop() before flying to a new district, setCenter()
 * to the new pivot, then start() to resume orbiting there.
 *
 * Uses a one-goTo-at-a-time `busy` guard so per-frame calls don't flood/cancel
 * each other, and pauses on direct user interaction (pointer/wheel), resuming a
 * few seconds after the user lets go.
 */
export class Orbit {
  private raf = 0;
  private running = false;
  private paused = false;
  private resumeAt = 0;
  private busy = false;
  private speed = 4; // degrees / second
  private center: number[] | null = null;
  private lockScale = 0; // pinned each (re)start so the orbit can't drift zoom
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

  /** Snapshot the current scale + tilt as the fixed orbit radius (call on start/resume). */
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
        this.lock(); // respect wherever the user left the zoom/tilt
      }
      if (!this.paused && !this.busy && !this.view.interacting && this.center) {
        this.busy = true;
        const heading = this.view.camera.heading + this.speed * dt;
        // Pin scale + tilt so ONLY heading changes → a clean orbit with no zoom drift.
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
