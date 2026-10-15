import { listMedia, addMedia, updateReview, deleteMedia } from "./archive.js";
import { searchProvider } from "./providers/index.js";

const CATEGORIES = [
  { id: "movies", label: "Movies" }, { id: "tv", label: "TV" },
  { id: "anime", label: "Anime" }, { id: "books", label: "Books" },
  { id: "games", label: "Games" }
];
const $ = selector => document.querySelector(selector);
const state = { category: null, items: [], filter: "all", archiveQuery: "", selected: null, searchTimer: null, searchController: null, toastTimer: null };
let activeRouteRequest = 0;
const nav = $("#primary-nav");
const hero = $("#hero");
const archiveView = $("#archive-view");
const grid = $("#poster-grid");
const empty = $("#empty-state");
const resultCount = $("#result-count");
const searchDialog = $("#search-dialog");
const providerQuery = $("#provider-query");
const searchResults = $("#search-results");
const searchStatus = $("#search-status");
const detailDialog = $("#detail-dialog");
const detailContent = $("#detail-content");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function route() {
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  return { category: CATEGORIES.some(item => item.id === parts[0]) ? parts[0] : null, id: parts[1] || null };
}
function hrefFor(category) { return `#/${category}`; }
function toast(message) {
  const target = $("#toast");
  target.textContent = message;
  target.classList.add("visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => target.classList.remove("visible"), 2600);
}
function renderNav() {
  nav.innerHTML = CATEGORIES.map(cat => `<a href="${hrefFor(cat.id)}" data-category="${cat.id}">${cat.label}</a>`).join("");
  $("#hero-links").innerHTML = CATEGORIES.map(cat => `<a href="${hrefFor(cat.id)}">${cat.label}</a>`).join("");
}
function updateActiveNav() {
  const category = state.category;
  nav.querySelectorAll("a").forEach(link => {
    if (link.dataset.category === category) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}
async function renderRoute() {
  const requestId = ++activeRouteRequest;
  const routeState = route();
  state.category = routeState.category;
  updateActiveNav();
  if (!state.category) {
    hero.classList.remove("hidden");
    archiveView.classList.add("hidden");
    return;
  }
  hero.classList.add("hidden");
  archiveView.classList.remove("hidden");
  const cat = CATEGORIES.find(item => item.id === state.category);
  $("#category-title").textContent = cat.label;
  $("#category-eyebrow").textContent = "YOUR COLLECTION";
  grid.innerHTML = "";
  empty.classList.add("hidden");
  resultCount.textContent = "Loading your archive…";
  try {
    const items = await listMedia(state.category);
    if (requestId !== activeRouteRequest) return;
    state.items = items;
    renderGrid();
    if (routeState.id) {
      const item = state.items.find(entry => entry.id === routeState.id);
      if (item) openDetails(item, false);
      else { detailDialog.close(); toast("That item wasn't found in this category."); }
    } else if (detailDialog.open) detailDialog.close();
  } catch (error) {
    if (requestId !== activeRouteRequest) return;
    console.error(error);
    resultCount.textContent = "";
    showEmpty("Could not load the archive. Check your Supabase configuration and access policies.");
  }
}
function renderGrid() {
  const query = state.archiveQuery.trim().toLocaleLowerCase();
  const shown = state.items.filter(item => {
    if (!String(item.title || "").toLocaleLowerCase().includes(query)) return false;
    if (state.filter === "rated") return item.rating != null && item.rating > 0;
    if (state.filter === "unrated") return item.rating == null || item.rating <= 0;
    return true;
  });
  grid.innerHTML = "";
  resultCount.textContent = `${shown.length} ${shown.length === 1 ? "entry" : "entries"}`;
  if (!shown.length) {
    showEmpty(state.items.length ? "Nothing matches those filters." : "Your archive is empty. Add something worth remembering.");
    return;
  }
  empty.classList.add("hidden");
  const fragment = document.createDocumentFragment();
  shown.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "poster-card";
    button.style.animationDelay = `${Math.min(index * 22, 220)}ms`;
    button.setAttribute("aria-label", `View ${item.title}`);
    const art = item.poster_url
      ? `<img src="${escapeHTML(item.poster_url)}" alt="" loading="lazy" decoding="async">`
      : `<span class="poster-placeholder">${escapeHTML(item.title)}</span>`;
    button.innerHTML = `${art}<span class="poster-overlay"><span class="poster-title">${escapeHTML(item.title)}</span><span class="poster-meta"><span>${escapeHTML(item.release_year || "Year unknown")}</span><span>${item.rating ? `<span class="rating-dot"></span>${Number(item.rating).toFixed(1)}` : ""}</span></span></span>`;
    button.addEventListener("click", () => {
      history.pushState(null, "", `#/${state.category}/${encodeURIComponent(item.id)}`);
      openDetails(item, false);
    });
    fragment.append(button);
  });
  grid.append(fragment);
}
function showEmpty(message) {
  empty.textContent = message;
  empty.classList.remove("hidden");
  grid.innerHTML = "";
}
function openSearch() {
  if (!state.category) return;
  providerQuery.value = "";
  searchResults.innerHTML = "";
  searchStatus.textContent = `Search ${CATEGORIES.find(cat => cat.id === state.category)?.label || "titles"} to begin.`;
  searchDialog.showModal();
  requestAnimationFrame(() => providerQuery.focus());
}
function closeSearch() {
  clearTimeout(state.searchTimer);
  state.searchController?.abort();
  if (searchDialog.open) searchDialog.close();
}
function renderSearchResults(items) {
  searchResults.innerHTML = "";
  if (!items.length) {
    searchStatus.textContent = "No results found.";
    return;
  }
  searchStatus.textContent = `${items.length} results`;
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const button = document.createElement("button");
    button.className = "search-result";
    button.type = "button";
    const art = item.poster_url
      ? `<img src="${escapeHTML(item.poster_url)}" alt="" loading="lazy" decoding="async">`
      : `<span class="poster-placeholder">No art</span>`;
    button.innerHTML = `${art}<span class="search-result-copy"><span class="search-result-title">${escapeHTML(item.title)}</span><span class="search-result-year">${escapeHTML(item.release_year || "Year unknown")}</span></span><span class="search-result-add" aria-hidden="true">＋</span>`;
    button.addEventListener("click", () => selectSearchResult(item, button));
    fragment.append(button);
  });
  searchResults.append(fragment);
}
async function runSearch() {
  const query = providerQuery.value.trim();
  clearTimeout(state.searchTimer);
  state.searchController?.abort();
  if (!query) {
    searchResults.innerHTML = "";
    searchStatus.textContent = "Start typing to search.";
    return;
  }
  const controller = new AbortController();
  state.searchController = controller;
  searchStatus.textContent = "Searching…";
  searchResults.innerHTML = "";
  try {
    const items = await searchProvider(state.category, query, controller.signal);
    if (controller.signal.aborted || providerQuery.value.trim() !== query) return;
    renderSearchResults(items);
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    searchStatus.textContent = error.message || "Search failed. Try again.";
  }
}
async function selectSearchResult(item, button) {
  button.disabled = true;
  const previous = button.innerHTML;
  button.innerHTML = `<span class="search-result-copy"><span class="search-result-title">Adding…</span></span>`;
  try {
    await addMedia(item);
    closeSearch();
    toast("Added to your archive.");
    await renderRoute();
  } catch (error) {
    console.error(error);
    button.disabled = false;
    button.innerHTML = previous;
    toast(error.message || "Could not add this title.");
  }
}
function openDetails(item, updateHash = true) {
  state.selected = item;
  if (updateHash) history.pushState(null, "", `#/${state.category}/${encodeURIComponent(item.id)}`);
  detailContent.innerHTML = "";
  const art = item.poster_url
    ? `<img src="${escapeHTML(item.poster_url)}" alt="${escapeHTML(item.title)}" decoding="async">`
    : `<span class="poster-placeholder">${escapeHTML(item.title)}</span>`;
  detailContent.innerHTML = `<div class="detail-layout"><div class="detail-art">${art}</div><section class="detail-copy"><p class="eyebrow">${escapeHTML(CATEGORIES.find(cat => cat.id === item.category)?.label || item.category)}</p><h2>${escapeHTML(item.title)}</h2><p class="detail-year">${escapeHTML(item.release_year || "Release year unknown")}</p><div class="stars" role="group" aria-label="Rate this title">${[1,2,3,4,5].map(value => { const fill = Math.max(0, Math.min(1, Number(item.rating || 0) - (value - 1))) * 100; return `<button type="button" class="star-button" data-star-index="${value - 1}" aria-label="Rate up to ${value} stars"><span class="star-empty">☆</span><span class="star-fill" style="width:${fill}%">★</span></button>`; }).join("")}<span class="rating-value">${item.rating ? `${Number(item.rating).toFixed(1)} / 5` : "Unrated"}</span></div><label class="review-label" for="review-text">YOUR NOTES</label><textarea class="review-text" id="review-text" placeholder="What did you think?">${escapeHTML(item.review || "")}</textarea><div class="review-actions"><button class="primary-button" id="save-review">Save notes</button><button class="danger-button" id="delete-media">Remove from archive</button></div></section></div>`;
  detailContent.querySelectorAll("[data-star-index]").forEach(button => button.addEventListener("click", async event => {
    const current = Number(state.selected.rating || 0);
    const index = Number(button.dataset.starIndex);
    const rect = button.getBoundingClientRect();
    // Keyboard activation selects a full star; pointer activation supports half-stars.
    const target = event.detail === 0 ? index + 1 : index + (event.clientX < rect.left + rect.width / 2 ? 0.5 : 1);
    const rating = current === target ? null : target;
    const saved = await persistReview({ rating, review: $("#review-text").value, message: rating == null ? "Rating removed." : "Rating saved." });
    if (saved && state.selected) refreshDetail();
  }));
  $("#save-review").addEventListener("click", async () => {
    const saved = await persistReview({ rating: state.selected.rating == null ? null : Number(state.selected.rating), review: $("#review-text").value, message: "Notes saved." });
    if (saved && state.selected) refreshDetail();
  });
  $("#delete-media").addEventListener("click", deleteSelected);
  if (!detailDialog.open) detailDialog.showModal();
}
function refreshDetail() {
  const id = state.selected?.id;
  const item = state.items.find(entry => entry.id === id);
  if (item) openDetails(item, false);
}
async function persistReview({ rating, review, message }) {
  const id = state.selected?.id;
  if (!id) return;
  const buttons = detailContent.querySelectorAll("button");
  buttons.forEach(button => button.disabled = true);
  try {
    await updateReview(id, rating, review);
    state.items = state.items.map(item => item.id === id ? { ...item, rating, review: review.trim() || null } : item);
    state.selected = state.items.find(item => item.id === id);
    renderGrid();
    toast(message);
    return true;
  } catch (error) {
    console.error(error);
    toast(error.message || "Could not save changes.");
    return false;
  } finally {
    buttons.forEach(button => button.disabled = false);
  }
}
async function deleteSelected() {
  if (!state.selected || !confirm(`Remove "${state.selected.title}" from your archive? This cannot be undone.`)) return;
  const id = state.selected.id;
  const button = $("#delete-media");
  button.disabled = true;
  button.textContent = "Removing…";
  try {
    await deleteMedia(id);
    state.items = state.items.filter(item => item.id !== id);
    detailDialog.close();
    history.replaceState(null, "", hrefFor(state.category));
    renderGrid();
    toast("Removed from archive.");
  } catch (error) {
    console.error(error);
    toast(error.message || "Could not remove this title.");
    button.disabled = false;
    button.textContent = "Remove from archive";
  }
}

renderNav();
renderRoute();
window.addEventListener("hashchange", renderRoute);
window.addEventListener("popstate", renderRoute);
$("#add-media").addEventListener("click", openSearch);
$("#close-search").addEventListener("click", closeSearch);
searchDialog.addEventListener("click", event => { if (event.target === searchDialog) closeSearch(); });
providerQuery.addEventListener("input", () => {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(runSearch, 250);
});
$("#close-detail").addEventListener("click", () => {
  detailDialog.close();
  history.replaceState(null, "", hrefFor(state.category || ""));
});
detailDialog.addEventListener("click", event => {
  if (event.target === detailDialog) {
    detailDialog.close();
    history.replaceState(null, "", hrefFor(state.category || ""));
  }
});
$("#archive-search").addEventListener("input", event => {
  state.archiveQuery = event.target.value;
  renderGrid();
});
document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
  state.filter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button));
  renderGrid();
}));
$("#mobile-menu").addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  $("#mobile-menu").setAttribute("aria-expanded", String(isOpen));
});
window.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (searchDialog.open) closeSearch();
    if (detailDialog.open) {
      detailDialog.close();
      history.replaceState(null, "", hrefFor(state.category || ""));
    }
  }
});