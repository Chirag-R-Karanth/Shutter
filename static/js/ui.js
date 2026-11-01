// Shared DOM + layout helpers. The header/nav is injected on every page so we
// don't duplicate markup in each HTML file.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

export function setHTML(node, html) {
  if (node) node.innerHTML = html;
}

export const TYPE_TO_NAV = {
  movie: "movies",
  tv: "tv",
  anime: "anime",
  game: "games",
  book: "books",
};

const NAV = [
  { key: "movies", label: "Movies", href: "index.html?type=movie" },
  { key: "tv", label: "TV", href: "index.html?type=tv" },
  { key: "anime", label: "Anime", href: "index.html?type=anime" },
  { key: "books", label: "Books", href: "index.html?type=book" },
  { key: "games", label: "Games", href: "index.html?type=game" },
  { key: "stats", label: "Stats", href: "stats.html" },
];

export function renderHeader(active = "") {
  const header = $("#app-header");
  if (!header) return;
  const links = NAV.map(
    (item) =>
      `<a class="nav-link${active === item.key ? " is-active" : ""}" href="${item.href}">${item.label}</a>`
  ).join("");
  header.innerHTML = `
    <nav class="nav container" aria-label="Primary">
      <a class="brand" href="index.html">Shutter</a>
      <div class="nav-links">${links}</div>
      <div class="nav-auth" id="auth-slot"></div>
    </nav>`;
}

export function renderFooter() {
  const footer = $("#app-footer");
  if (!footer) return;
  footer.innerHTML = `<p class="dim">Shutter — a personal media archive.</p>`;
}

export function toast(message, kind = "info") {
  const region = $("#toast-region");
  if (!region) return;
  const el = document.createElement("div");
  el.className = `toast toast--${kind}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function emptyState(node, title, hint = "") {
  setHTML(
    node,
    `<div class="empty">
       <p class="empty__title">${escapeHtml(title)}</p>
       ${hint ? `<p class="empty__hint muted">${escapeHtml(hint)}</p>` : ""}
     </div>`
  );
}

export function loadingState(node, label = "Loading…") {
  setHTML(node, `<div class="loading" role="status" aria-live="polite">${escapeHtml(label)}</div>`);
}
