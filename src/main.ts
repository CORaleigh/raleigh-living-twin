import esriConfig from "@arcgis/core/config";
import "./styles.css";
import { createTwin } from "./scene/twin";
import { Orbit } from "./scene/orbit";
import { renderPermitBeacons, renderDistrictBeacons } from "./scene/beacons";
import { DISTRICTS, CITY_CAMERA } from "./config/districts";
import { queryTopPermits, queryDistrictStats, queryCityStats } from "./services/permits";
import { buildSelector, setSelectorTotals } from "./ui/selector";
import { renderSpotlight } from "./ui/spotlight";
import { renderHero } from "./ui/hero";
import { updateKpis } from "./ui/kpis";
import { state } from "./state";
import type { DistrictData } from "./types";

const apiKey = import.meta.env.VITE_ARCGIS_API_KEY as string | undefined;
if (apiKey) esriConfig.apiKey = apiKey;

const { view, beaconLayer } = createTwin("viewDiv", Boolean(apiKey));
const orbit = new Orbit(view);
const selectorEl = document.getElementById("selector")!;
const spotEl = document.getElementById("spot")!;
const heroEl = document.getElementById("hero")!;

// Hero narrative panel follows the current selection.
state.subscribe((s) => {
  const districtName = s.view === "city" ? "" : DISTRICTS[s.view].name;
  renderHero(heroEl, s.selected, districtName, () => state.select(null));
});

// Working copy of the districts with permits/totals filled in as we learn them.
const districts: DistrictData[] = DISTRICTS.map((d) => ({ ...d, permits: [], total: 0, count: 0 }));
let lastView: string = "";
let ready = false; // becomes true once the SceneView is usable (guards applyView)

function idIndex(id: string): number {
  return DISTRICTS.findIndex((d) => d.id === id);
}

function spotlightNow(): void {
  const s = state.get();
  renderSpotlight(spotEl, { view: s.view, districts, selected: s.selected });
}

async function ensurePermits(i: number): Promise<void> {
  const d = districts[i];
  if (d.permits.length) return;
  d.permits = await queryTopPermits(DISTRICTS[i], 8);
  if (!d.count) {
    d.count = d.permits.length;
    d.total = d.permits.reduce((s, p) => s + p.cost, 0);
  }
}

async function flyTo(target: __esri.GoToTarget3D): Promise<void> {
  orbit.stop(); // don't let the orbit cancel the fly-to mid-flight
  await view.goTo(target, { animate: true, duration: 1500, easing: "out-cubic" }).catch(() => {});
}

async function applyView(): Promise<void> {
  if (!ready) return;
  const s = state.get();
  const key = String(s.view);

  if (lastView !== key) {
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
  spotlightNow();
}

// Re-render whenever view or selection changes.
state.subscribe(() => void applyView());

// ---- click-to-drill: district beacon → enter district; permit beacon → select ----
view.on("click", async (event) => {
  const hit = await view.hitTest(event, { include: [beaconLayer] });
  const g = hit.results.find((r) => "graphic" in r) as __esri.GraphicHit | undefined;
  const attr = g?.graphic?.attributes;
  if (!attr) {
    // click empty space: step back out (permit → district → city)
    const s = state.get();
    if (s.selected) state.select(null);
    else if (s.view !== "city") state.setView("city");
    return;
  }
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

// ---- spotlight prev/next cycles permits within the current district ----
function cycle(delta: number): void {
  const s = state.get();
  if (s.view === "city") return;
  const list = districts[s.view].permits;
  if (!list.length) return;
  const cur = s.selected ? list.indexOf(s.selected) : 0;
  const next = (cur + delta + list.length) % list.length;
  state.select(list[next]);
}
document.getElementById("next")!.addEventListener("click", () => cycle(1));
document.getElementById("prev")!.addEventListener("click", () => cycle(-1));

// ---- play / pause orbit ----
let playing = true;
const playBtn = document.getElementById("playbtn")!;
playBtn.addEventListener("click", () => {
  playing = !playing;
  if (playing) orbit.start();
  else orbit.stop();
  playBtn.querySelector("#playlabel")!.textContent = playing ? "Pause orbit" : "Resume orbit";
});

// ---- boot ----
buildSelector(selectorEl);

view.when(async () => {
  ready = true;

  // Preload district totals so the selector + city aggregate beacons are ready.
  const stats = await Promise.all(DISTRICTS.map((d) => queryDistrictStats(d).catch(() => ({ n: 0, total: 0 }))));
  stats.forEach((s, i) => {
    districts[i].count = s.n;
    districts[i].total = s.total;
  });
  setSelectorTotals(selectorEl, districts);

  // Default chapter: drop straight into Downtown (index 0) and orbit it.
  state.setView(0);

  // Citywide KPI cards.
  queryCityStats().then(updateKpis).catch((e) => console.info("City stats unavailable:", e?.message));
});

// Update the small heading + view readout each frame is overkill; watch the camera instead.
view.watch("camera", (cam: __esri.Camera) => {
  const hdg = document.getElementById("hdg");
  if (hdg && cam) hdg.textContent = String(Math.round(cam.heading)).padStart(3, "0") + "°";
});
state.subscribe((s) => {
  const v = document.getElementById("vlabel");
  if (v) v.textContent = s.view === "city" ? "City" : DISTRICTS[s.view].name;
});
