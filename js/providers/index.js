import { searchTMDB } from "./tmdb.js";
import { searchAniList } from "./anilist.js";
import { searchOpenLibrary } from "./openlibrary.js";
import { searchIGDB } from "./igdb.js";

export function searchProvider(category, query, signal) {
  if (!query.trim()) return Promise.resolve([]);
  switch (category) {
    case "movies": return searchTMDB("movies", query, signal);
    case "tv": return searchTMDB("tv", query, signal);
    case "anime": return searchAniList(query, signal);
    case "books": return searchOpenLibrary(query, signal);
    case "games": return searchIGDB(query, signal);
    default: return Promise.reject(new Error("Unsupported media category."));
  }
}