import { config } from "../config.js";

// IGDB requires Twitch OAuth. Never copy the current server-side bearer token into this file.
// Set up a small serverless proxy that validates input, rate-limits requests, and adds credentials.
export async function searchIGDB(query, signal) {
  const endpoint = config.igdbProxyUrl;
  if (!endpoint) throw new Error("Games search needs an IGDB proxy. Configure igdbProxyUrl in js/config.js.");
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  const response = await fetch(url, { signal, headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error(`Games search failed (${response.status})`);
  const items = await response.json();
  return (Array.isArray(items) ? items : []).map(item => ({
    external_id: String(item.external_id ?? item.id),
    title: item.title ?? item.name ?? "Untitled",
    release_year: item.release_year ?? null,
    poster_url: item.poster_url ?? null,
    backdrop_url: item.backdrop_url ?? null,
    category: "games"
  }));
}