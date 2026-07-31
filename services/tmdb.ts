import { SearchResult } from "@/types";

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";

export async function searchMovies(query: string): Promise<SearchResult[]> {
  if (!TMDB_API_KEY) throw new Error("TMDb API key is missing");

  const res = await fetch(
    `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      query
    )}&include_adult=false&page=1`
  );
  if (!res.ok) throw new Error("Failed to fetch movies");
  
  const data = await res.json();
  
  return data.results.map((item: any) => ({
    external_id: item.id.toString(),
    title: item.title,
    release_year: item.release_date ? parseInt(item.release_date.substring(0, 4)) : null,
    poster_url: item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : null,
    backdrop_url: item.backdrop_path ? `${BACKDROP_BASE}${item.backdrop_path}` : null,
    category: "movies",
  }));
}

export async function searchTV(query: string): Promise<SearchResult[]> {
  if (!TMDB_API_KEY) throw new Error("TMDb API key is missing");

  const res = await fetch(
    `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      query
    )}&include_adult=false&page=1`
  );
  if (!res.ok) throw new Error("Failed to fetch TV shows");
  
  const data = await res.json();
  
  return data.results.map((item: any) => ({
    external_id: item.id.toString(),
    title: item.name,
    release_year: item.first_air_date ? parseInt(item.first_air_date.substring(0, 4)) : null,
    poster_url: item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : null,
    backdrop_url: item.backdrop_path ? `${BACKDROP_BASE}${item.backdrop_path}` : null,
    category: "tv",
  }));
}
