import { supabase } from "./supabase.js";

export const TYPES = ["movie", "tv", "anime", "game", "book"];
export const STATUSES = ["planned", "in_progress", "done"];

export const TYPE_LABELS = {
  movie: "Movie",
  tv: "TV",
  anime: "Anime",
  game: "Game",
  book: "Book",
};

export const STATUS_LABELS = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
};

// --- Entries (Supabase) ----------------------------------------------------

export async function listEntries() {
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getEntry(id) {
  const { data, error } = await supabase.from("media").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createEntry(payload) {
  const { data, error } = await supabase.from("media").insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function updateEntry(id, patch) {
  const { data, error } = await supabase
    .from("media")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(id) {
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) throw error;
}

// --- Metadata search (Phase 3) ---------------------------------------------
// TMDB (movie/tv) and IGDB (game) go through Edge Functions so their keys stay
// server-side. AniList (anime) and Open Library (book) need no key and are
// called directly from the browser.
// Each returns [] of { title, year, type, cover, overview, externalId }.

export async function searchMetadata(type, query) {
  const q = query.trim();
  if (!q) return [];
  if (type === "anime") return searchAniList(q);
  if (type === "book") return searchOpenLibrary(q);
  const fn = type === "game" ? "games" : "tmdb";
  const { data, error } = await supabase.functions.invoke(fn, { body: { type, query: q } });
  if (error) throw error;
  return data?.results ?? [];
}

async function searchAniList(query) {
  const gql = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          title { english romaji }
          seasonYear
          description(asHtml: false)
          coverImage { extraLarge }
        }
      }
    }`;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: gql, variables: { search: query } }),
  });
  if (!res.ok) throw new Error("AniList search failed");
  const { data } = await res.json();
  const media = data?.Page?.media ?? [];
  return media.map((item) => ({
    externalId: String(item.id),
    title: item.title?.english || item.title?.romaji || "",
    year: item.seasonYear ?? null,
    type: "anime",
    cover: item.coverImage?.extraLarge ?? null,
    overview: item.description ?? "",
  }));
}

async function searchOpenLibrary(query) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Open Library search failed");
  const data = await res.json();
  return (data.docs ?? []).map((item) => ({
    externalId: item.key ? item.key.replace("/works/", "") : "",
    title: item.title ?? "",
    year: item.first_publish_year ?? null,
    type: "book",
    cover: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
    overview: "",
  }));
}
