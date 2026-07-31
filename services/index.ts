import { MediaType, SearchResult } from "@/types";
import { searchMovies, searchTV } from "./tmdb";
import { searchAnime } from "./anilist";
import { searchBooks } from "./books";
import { searchGames } from "./igdb";

export async function searchMedia(category: MediaType, query: string): Promise<SearchResult[]> {
  if (!query) return [];

  switch (category) {
    case "movies":
      return searchMovies(query);
    case "tv":
      return searchTV(query);
    case "anime":
      return searchAnime(query);
    case "books":
      return searchBooks(query);
    case "games":
      return searchGames(query);
    default:
      return [];
  }
}
