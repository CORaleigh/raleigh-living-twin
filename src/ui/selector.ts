import { DISTRICTS } from "../config/districts";
import { fmtCost } from "../services/permits";
import { state } from "../state";
import type { DistrictData, ViewMode } from "../types";

/**
 * The district "chapter" selector. Buttons carry each district's live total once
 * it's known. Clicking dispatches a view change through the store.
 */
export function buildSelector(el: HTMLElement): void {
  el.innerHTML = "";

  const city = document.createElement("button");
  city.className = "seg city";
  city.dataset.mode = "city";
  city.textContent = "◍ City";
  el.appendChild(city);

  DISTRICTS.forEach((d, i) => {
    const b = document.createElement("button");
    b.className = "seg";
    b.dataset.mode = String(i);
    b.innerHTML = `${d.name} <span class="tot" data-tot="${d.id}">—</span>`;
    el.appendChild(b);
  });

  el.querySelectorAll<HTMLButtonElement>(".seg").forEach((b) => {
    b.addEventListener("click", () => {
      const m = b.dataset.mode!;
      state.setView(m === "city" ? "city" : Number(m));
    });
  });

  state.subscribe((s) => highlight(el, s.view));
}

function highlight(el: HTMLElement, view: ViewMode): void {
  el.querySelectorAll<HTMLButtonElement>(".seg").forEach((b) => {
    const m = b.dataset.mode!;
    const active = (m === "city" && view === "city") || Number(m) === view;
    b.classList.toggle("active", active);
  });
}

/** Fill in the per-district totals once queried. */
export function setSelectorTotals(el: HTMLElement, districts: DistrictData[]): void {
  districts.forEach((d) => {
    const span = el.querySelector<HTMLElement>(`[data-tot="${d.id}"]`);
    if (span) {
      const fc = fmtCost(d.total);
      span.textContent = `$${fc.val}${fc.unit}`;
    }
  });
}
