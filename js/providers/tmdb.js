const API = "https://api.themoviedb.org/3";
const POSTER = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/original";

export async function searchTMDB(category, query, signal) {
  const key = import.meta.env?.TMDB_API_KEY;
  // Vite-style env values are intentionally not required: static hosting cannot hide secrets.
  // Use a TMDB API key only if your distribution policy permits browser exposure,
  // otherwise route this provider through a small serverless proxy.
  const publicKey = key || window.SHUTTER_CONFIG?.tmdbApiKey;
  if (!publicKey) throw new Error("TMDB search is not configured. Add a protected proxy or an approved public key.");
  const endpoint = category === "tv" ? "search/tv" : "search/movie";
  const response = await fetch(`${API}/${endpoint}?api_key=${encodeURIComponent(publicKey)}&query=${encodeURIComponent(query)}&include_adult=false&page=1`, { signal });
  if (!response.ok) throw new Error(`TMDB request failed (${response.status})`);
  const json = await response.json();
  return (json.results || []).map(item => ({
    external_id: String(item.id),
    title: category === "tv" ? item.name : item.title,
    release_year: Number.parseInt((category === "tv" ? item.first_air_date : item.release_date || "").slice(0, 4), 10) || null,
    poster_url: item.poster_path ? POSTER + item.poster_path : null,
    backdrop_url: item.backdrop_path ? BACKDROP + item.backdrop_path : null,
    category
  }));
}