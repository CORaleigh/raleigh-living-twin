// Central element lookups and a small HTML-escape helper. Keeping the id
// strings in one place means markup changes touch exactly one file, and a
// missing element fails loudly at startup instead of surfacing as a later null.

function must<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Expected #${id} in the DOM`);
  return el as T;
}

export const els = {
  selector: must("selector"),
  spotlight: must("spot"),
  projView: must("projView"),
  prev: must<HTMLButtonElement>("prev"),
  next: must<HTMLButtonElement>("next"),
  playBtn: must<HTMLButtonElement>("playbtn"),
  playLabel: must("playlabel"),
  heading: must("hdg"),
  viewLabel: must("vlabel"),
  kpiCount: must("k1"),
  kpiValue: must("k2"),
  sourceBadge: must("srcbadge")
};

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

// Escape untrusted text (e.g. permit fields from the service) before it goes
// into an innerHTML template.
export function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}
