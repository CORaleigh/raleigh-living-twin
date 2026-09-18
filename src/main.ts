import esriConfig from "@arcgis/core/config";
import "./styles.css";
import { createTwin } from "./scene/twin";
import { Orbit } from "./scene/orbit";
import { renderPermitBeacons, renderDistrictBeacons } from "./scene/beacons";
import { DISTRICTS, CITY_CAMERA } from "./config/districts";
import { queryTopPermits, queryDistrictStats, queryCityStats } from "./services/permits";
import { buildSelector, setSelectorTotals } from "./ui/selector";
import { renderSpotlight } from "./ui/spotlight";
import { updateKpis } from "./ui/kpis";
import { demoPermitsFor } from "./config/projectMedia";
import { Turntable } from "./three/turntable";
import { els } from "./dom";
import { state } from "./state";
import type { DistrictData, Permit } from "./types";

const apiKey = import.meta.env.VITE_ARCGIS_API_KEY as string | undefined;
if (apiKey) esriConfig.apiKey = apiKey;

const { view, beaconLayer } = createTwin("viewDiv", Boolean(apiKey));
const orbit = new Orbit(view);

function idIndex(id: string): number {
  return DISTRICTS.findIndex((d) => d.id === id);
}

// 3D turntable of the selected project's rendering, shown in the spotlight panel.
let turntable: Turntable | null = null;
let shownMediaId: number | null = null;

function updateProjectViewer(selected: Permit | null): void {
  const id = selected?.media ? selected.objectId : null;
  if (id === shownMediaId) return;
  shownMediaId = id;
  turntable?.dispose();
  turntable = null;
  els.projView.innerHTML = "";
  if (!selected?.media) {
    els.projView.hidden = true;
    return;
  }
  els.projView.hidden = false;
  const canvas = document.createElement("div");
  canvas.className = "pv-canvas";
  const credit = document.createElement("div");
  credit.className = "pv-credit";
  credit.textContent = selected.media.credit;
  els.projView.append(canvas, credit);
  const media = selected.media;
  // If the model/image can't load (e.g. not bundled in this build), show a note.
  const showPlaceholder = () => {
    canvas.classList.add("pv-empty");
    canvas.textContent = "3D rendering available in the internal build";
  };
  try {
    turntable = new Turntable(canvas, media, showPlaceholder);
  } catch (err) {
    // WebGL/turntable failed to start: fall back to the flat rendering so the
    // user still sees something, and surface the reason in the console.
    console.error("Turntable failed to initialize:", err);
    canvas.innerHTML = "";
    const img = document.createElement("img");
    img.src = media.colorUrl;
    img.alt = "";
    img.className = "pv-fallback";
    img.onerror = showPlaceholder;
    canvas.appendChild(img);
  }
}

// Local copy of districts, filled with permits/totals as they load.
const districts: DistrictData[] = DISTRICTS.map((d) => ({ ...d, permits: [], total: 0, count: 0 }));
let lastView: string = "";
let lastSelected: number | null = null;
let ready = false; // true once the SceneView is ready

async function ensurePermits(i: number): Promise<void> {
  const d = districts[i];
  if (d.permits.length) return;
  const live = await queryTopPermits(DISTRICTS[i], 8);
  const demos = demoPermitsFor(DISTRICTS[i].id);
  d.permits = [...demos, ...live].sort((a, b) => b.cost - a.cost);
  if (!d.count) {
    d.count = d.permits.length;
    d.total = d.permits.reduce((s, p) => s + p.cost, 0);
  }
}

async function flyTo(target: __esri.GoToTarget3D): Promise<void> {
  orbit.stop(); // otherwise the orbit cancels the goTo
  await view.goTo(target, { animate: true, duration: 1500, easing: "out-cubic" }).catch(() => {});
}

async function applyView(): Promise<void> {
  if (!ready) return;
  const s = state.get();
  const key = String(s.view);
  const viewChanged = lastView !== key;

  if (viewChanged) {
    if (s.view === "city") {
      renderDistrictBeacons(beaconLayer, districts);
      orbit.setSpeed(3);
      orbit.setCenter(CITY_CAMERA.center);
      await flyTo({ center: CITY_CAMERA.center, zoom: CITY_CAMERA.zoom, tilt: CITY_CAMERA.tilt, heading: CITY_CAMERA.heading });
    } else {
      const i = s.view;
      await ensurePermits(i);
      renderPermitBeacons(beaconLayer, districts[i].permits);
      orbit.setSpeed(6);
      orbit.setCenter(DISTRICTS[i].center);
      const c = DISTRICTS[i].camera;
      await flyTo({ center: DISTRICTS[i].center, zoom: c.zoom, tilt: c.tilt, heading: c.heading });
    }
    lastView = key;
    if (playing) orbit.start(); // resume orbiting the new pivot
  }

  // Selecting a permit pivots the orbit onto it; deselecting pulls back to the
  // district. Skipped right after a view change since that flight already framed it.
  const selId = s.selected?.objectId ?? null;
  if (!viewChanged && selId !== lastSelected && s.view !== "city") {
    const i = s.view;
    const c = DISTRICTS[i].camera;
    if (s.selected) {
      const pivot: [number, number] = [s.selected.lon, s.selected.lat];
      orbit.setSpeed(5);
      orbit.setCenter(pivot);
      await flyTo({ center: pivot, zoom: c.zoom + 1, tilt: c.tilt });
    } else {
      orbit.setSpeed(6);
      orbit.setCenter(DISTRICTS[i].center);
      await flyTo({ center: DISTRICTS[i].center, zoom: c.zoom, tilt: c.tilt });
    }
    if (playing) orbit.start();
  }
  lastSelected = selId;

  renderSpotlight(els.spotlight, { view: s.view, districts, selected: s.selected });
  updateProjectViewer(s.selected);
}

state.subscribe(() => void applyView());

// Click a beacon to enter a district or select a permit; clicks elsewhere are
// ignored (navigation is via the selector and prev/next buttons).
view.on("click", async (event) => {
  const hit = await view.hitTest(event, { include: [beaconLayer] });
  const g = hit.results.find((r) => "graphic" in r) as __esri.GraphicHit | undefined;
  const attr = g?.graphic?.attributes;
  if (!attr) return;
  if (attr.kind === "district") {
    const i = idIndex(attr.districtId);
    if (i >= 0) state.setView(i);
  } else if (attr.kind === "permit") {
    const s = state.get();
    if (s.view !== "city") {
      const p = districts[s.view].permits.find((x) => x.objectId === attr.objectId);
      if (p) state.select(p);
    }
  }
});

// prev/next cycle through the current district's permits
function cycle(delta: number): void {
  const s = state.get();
  if (s.view === "city") return;
  const list = districts[s.view].permits;
  if (!list.length) return;
  const cur = s.selected ? list.indexOf(s.selected) : 0;
  const next = (cur + delta + list.length) % list.length;
  state.select(list[next]);
}
els.next.addEventListener("click", () => cycle(1));
els.prev.addEventListener("click", () => cycle(-1));

// play / pause the orbit
let playing = true;
els.playBtn.addEventListener("click", () => {
  playing = !playing;
  if (playing) orbit.start();
  else orbit.stop();
  els.playLabel.textContent = playing ? "Pause orbit" : "Resume orbit";
});

buildSelector(els.selector);

view.when(async () => {
  ready = true;

  // Preload district totals for the selector and aggregate beacons.
  const stats = await Promise.all(DISTRICTS.map((d) => queryDistrictStats(d).catch(() => ({ n: 0, total: 0 }))));
  stats.forEach((s, i) => {
    districts[i].count = s.n;
    districts[i].total = s.total;
  });
  setSelectorTotals(els.selector, districts);

  // Start in Downtown.
  state.setView(0);

  queryCityStats().then(updateKpis).catch((e) => console.info("City stats unavailable:", e?.message));
});

// Watch the camera instead of updating the heading readout every frame.
view.watch("camera", (cam: __esri.Camera) => {
  if (cam) els.heading.textContent = String(Math.round(cam.heading)).padStart(3, "0") + "°";
});
state.subscribe((s) => {
  els.viewLabel.textContent = s.view === "city" ? "City" : DISTRICTS[s.view].name;
});
