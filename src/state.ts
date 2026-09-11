import type { ViewMode, Permit } from "./types";

interface AppState {
  view: ViewMode;
  selected: Permit | null; // selected permit in district view
}

type Listener = (s: AppState) => void;

// Minimal observable store: subscribe/notify, no framework.
class Store {
  private state: AppState = { view: "city", selected: null };
  private listeners = new Set<Listener>();

  get(): AppState {
    return this.state;
  }
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }
  private notify() {
    for (const fn of this.listeners) fn(this.state);
  }
  setView(view: ViewMode) {
    this.state = { view, selected: null };
    this.notify();
  }
  select(permit: Permit | null) {
    this.state = { ...this.state, selected: permit };
    this.notify();
  }
}

export const state = new Store();
