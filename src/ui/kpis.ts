import { fmtCost } from "../services/permits";
import { els } from "../dom";

// Fill the citywide KPI cards from the stats query.
export function updateKpis(counts: { n: number; total: number }): void {
  els.kpiCount.textContent = counts.n.toLocaleString();
  const fc = fmtCost(counts.total);
  els.kpiValue.innerHTML = `$${fc.val}<span class="u"> ${fc.unit}</span>`;
  els.sourceBadge.textContent = "LIVE";
  els.sourceBadge.title = "Citywide active-permit totals from Raleigh Open Data";
}
