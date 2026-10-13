import { config } from "../config.js";

const API = "https://api.themoviedb.org/3";
const POSTER = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/original";

export async function searchTMDB(category, query, signal) {
  // Browser configuration is public. Use only a key whose exposure is acceptable,
  // or configure a server-side proxy instead. Never put private credentials here.
  const publicKey = config.tmdbApiKey;
  if (!publicKey) throw new Error("TMDB search is not configured. Add a protected proxy or an approved public key.");
  const endpoint = category === "tv" ? "search/tv" : "search/movie";
  const response = await fetch(`${API}/${endpoint}?api_key=${encodeURIComponent(publicKey)}&query=${encodeURIComponent(query)}&include_adult=false&page=1`, { signal });
  if (!response.ok) throw new Error(`TMDB request failed (${response.status})`);
  const json = await response.json();
  return (json.results || []).map(item => {
    const releaseDate = (category === "tv" ? item.first_air_date : item.release_date) || "";
    return {
      external_id: String(item.id),
      title: category === "tv" ? item.name : item.title,
      release_year: Number.parseInt(releaseDate.slice(0, 4), 10) || null,
      poster_url: item.poster_path ? POSTER + item.poster_path : null,
      backdrop_url: item.backdrop_path ? BACKDROP + item.backdrop_path : null,
      category
    };
  });
}