import { fmtCost } from "../services/permits";
import type { Permit } from "../types";

/**
 * Prominent "hero narrative" panel shown when a beacon/permit is selected.
 * Renders the full story for that permit; hidden when nothing is selected.
 */
export function renderHero(el: HTMLElement, permit: Permit | null, districtName: string, onClose: () => void): void {
  if (!permit) {
    el.classList.remove("show");
    el.innerHTML = "";
    return;
  }
  const fc = fmtCost(permit.cost);
  el.innerHTML = `
    <button class="hero-close" aria-label="Close">×</button>
    <div class="hero-eyebrow">◈ Spotlighted permit${districtName ? " · " + districtName : ""}</div>
    <div class="hero-name">${permit.name}</div>
    <div class="hero-val">$${fc.val}${fc.unit}<span> estimated project cost</span></div>
    <div class="hero-chips"><span class="chip hot">${permit.type}</span><span class="chip">${permit.status}</span></div>
    <p class="hero-nar">${permit.narrative || "No work description was provided for this permit."}</p>
    <div class="hero-stats">
      <div><span class="k">Floors</span><span class="v">${permit.floors ?? "—"}</span></div>
      <div><span class="k">Units</span><span class="v">${permit.units ?? "—"}</span></div>
      <div><span class="k">Address</span><span class="v">${permit.address}</span></div>
    </div>`;
  el.querySelector<HTMLButtonElement>(".hero-close")!.addEventListener("click", onClose);
  el.classList.add("show");
}
