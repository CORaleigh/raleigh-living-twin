import { fmtCost } from "../services/permits";

/** Update the citywide KPI cards from live statistics. */
export function updateKpis(counts: { n: number; total: number }): void {
  const k1 = document.getElementById("k1");
  const k2 = document.getElementById("k2");
  if (k1) k1.textContent = counts.n.toLocaleString();
  if (k2) {
    const fc = fmtCost(counts.total);
    k2.innerHTML = `$${fc.val}<span class="u"> ${fc.unit}</span>`;
  }
  const badge = document.getElementById("srcbadge");
  if (badge) {
    badge.textContent = "LIVE";
    badge.title = "Citywide active-permit totals from Raleigh Open Data";
  }
}
