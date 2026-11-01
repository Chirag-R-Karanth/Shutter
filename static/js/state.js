// Tiny observable store. No framework, just a Set of listeners.
const listeners = new Set();

export const state = {
  session: null,
  user: null,
  entries: [],
  filters: {
    type: "all",
    rating: "all",
    status: "all",
    sort: "recent",
    q: "",
  },
};

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
