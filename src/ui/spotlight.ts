import { fmtCost } from "../services/permits";
import type { DistrictData, Permit, ViewMode } from "../types";

interface SpotlightModel {
  view: ViewMode;
  districts: DistrictData[];
  selected: Permit | null;
}

/** Renders the bottom-right spotlight card for either the city or a district/permit. */
export function renderSpotlight(root: HTMLElement, m: SpotlightModel): void {
  const tag = root.querySelector<HTMLElement>("#sptag")!;
  const body = root.querySelector<HTMLElement>("#spbody")!;

  if (m.view === "city") {
    const total = m.districts.reduce((s, d) => s + d.total, 0);
    const permits = m.districts.reduce((s, d) => s + d.count, 0);
    const top = m.districts.reduce((a, b) => (b.total > a.total ? b : a), m.districts[0]);
    const fc = fmtCost(total);
    tag.textContent = "◈ City overview";
    body.innerHTML = `
      <div class="sp-rank">${m.districts.length} focus districts · beacon height = district total</div>
      <div class="sp-name">Raleigh · active development</div>
      <div class="sp-meta">Pick a district, or click a beacon, to drill in.</div>
      <div class="sp-stats">
        <div class="sp-stat"><div class="k">Active value</div><div class="v amber">$${fc.val}${fc.unit}</div></div>
        <div class="sp-stat"><div class="k">Permits</div><div class="v">${permits}</div></div>
        <div class="sp-stat"><div class="k">Top district</div><div class="v">${top ? top.name : "—"}</div></div>
      </div>`;
    return;
  }

  const d = m.districts[m.view];
  const p = m.selected ?? d?.permits[0];
  if (!d || !p) {
    tag.textContent = "◈ Loading";
    body.innerHTML = `<div class="sp-meta">Querying active permits…</div>`;
    return;
  }
  const rank = [...d.permits].sort((a, b) => b.cost - a.cost).indexOf(p) + 1;
  const fc = fmtCost(p.cost);
  tag.textContent = "◈ " + d.name;
  body.innerHTML = `
    <div class="sp-rank">#${rank} of ${d.count} in ${d.name} · ${p.address}</div>
    <div class="sp-name">${p.name}</div>
    <div class="sp-meta">${p.type}${p.narrative ? " · " + p.narrative : ""}</div>
    <div class="sp-stats">
      <div class="sp-stat"><div class="k">Valuation</div><div class="v amber">$${fc.val}${fc.unit}</div></div>
      <div class="sp-stat"><div class="k">Floors</div><div class="v">${p.floors ?? "—"}</div></div>
      <div class="sp-stat"><div class="k">Units</div><div class="v">${p.units ?? "—"}</div></div>
    </div>
    <div class="sp-status"><span class="dot"></span>${p.status}</div>`;
}
