export type MediaType = "movies" | "tv" | "anime" | "books" | "games";

export interface MediaItem {
  id: string;
  category: MediaType;
  title: string;
  release_year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  external_id: string;
  rating: number | null;
  review: string | null;
  is_logged: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  external_id: string;
  title: string;
  release_year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  category: MediaType;
}
