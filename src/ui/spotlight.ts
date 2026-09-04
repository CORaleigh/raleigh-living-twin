import { DISTRICTS } from "../config/districts";
import { fmtCost } from "../services/permits";
import type { DistrictData, Permit, ViewMode } from "../types";

export interface SpotlightModel {
  view: ViewMode;
  districts: DistrictData[];
  selected: Permit | null;
}

/**
 * Renders the bottom-right project panel. Three states:
 *  - a permit is selected → full project detail (cost, chips, address, narrative);
 *  - a district is entered, nothing selected → district summary + how to browse;
 *  - the city overview → citywide aggregate.
 * The header (#sptag) and body (#spbody) live in index.html; this fills them.
 */
export function renderSpotlight(root: HTMLElement, m: SpotlightModel): void {
  const tag = root.querySelector<HTMLElement>("#sptag")!;
  const body = root.querySelector<HTMLElement>("#spbody")!;

  // --- selected project ---
  if (m.view !== "city" && m.selected) {
    const p = m.selected;
    const d = m.districts[m.view];
    const rank = d.permits.findIndex((x) => x.objectId === p.objectId);
    const fc = fmtCost(p.cost);
    tag.textContent = "◈ Active project";
    body.innerHTML =
      (rank >= 0 ? `<div class="sp-rank">#${rank + 1} of ${d.permits.length} · ${d.name}</div>` : "") +
      `<div class="sp-name">${p.name}</div>` +
      `<div class="sp-meta">${p.address || "Address unavailable"}</div>` +
      `<div class="sp-chips"><span class="chip hot">${p.type}</span><span class="chip">${p.status}</span></div>` +
      (p.narrative ? `<div class="sp-nar">${p.narrative}</div>` : "") +
      `<div class="sp-stats">` +
        stat("Est. cost", `$${fc.val}${fc.unit}`, true) +
        (p.units != null ? stat("Units", String(p.units)) : "") +
        (p.floors != null ? stat("Floors", String(p.floors)) : "") +
      `</div>` +
      `<div class="sp-status"><span class="dot"></span>${p.status}</div>`;
    return;
  }

  // --- district entered, nothing selected ---
  if (m.view !== "city") {
    const d = m.districts[m.view];
    const fc = fmtCost(d.total);
    tag.textContent = "◈ District";
    body.innerHTML =
      `<div class="sp-name">${d.name}</div>` +
      `<div class="sp-meta">Click a beacon or use ‹ › to browse projects.</div>` +
      `<div class="sp-stats">` +
        stat("Active valuation", `$${fc.val}${fc.unit}`, true) +
        stat("Permits", String(d.count || d.permits.length)) +
      `</div>`;
    return;
  }

  // --- city overview ---
  const total = m.districts.reduce((s, d) => s + d.total, 0);
  const count = m.districts.reduce((s, d) => s + d.count, 0);
  const fc = fmtCost(total);
  tag.textContent = "◈ City overview";
  body.innerHTML =
    `<div class="sp-name">Raleigh — all chapters</div>` +
    `<div class="sp-meta">Pick a district above to drop in.</div>` +
    `<div class="sp-stats">` +
      stat("Focus valuation", `$${fc.val}${fc.unit}`, true) +
      stat("Active permits", String(count)) +
      stat("Districts", String(DISTRICTS.length)) +
    `</div>`;
}

function stat(k: string, v: string, amber = false): string {
  return `<div class="sp-stat"><div class="k">${k}</div><div class="v${amber ? " amber" : ""}">${v}</div></div>`;
}
