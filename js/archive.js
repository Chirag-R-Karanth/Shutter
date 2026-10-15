import { supabase } from "./supabase.js";

const variants = {
  movies: ["movies", "movie"],
  tv: ["tv"],
  anime: ["anime"],
  books: ["books", "book"],
  games: ["games", "game"]
};

export async function listMedia(category) {
  const { data, error } = await supabase.from("media").select("*")
    .in("category", variants[category] || [category])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addMedia(item) {
  const allowed = ["movies", "tv", "anime", "books", "games"];
  if (!allowed.includes(item.category)) throw new Error("Invalid media category.");
  const categoryVariants = variants[item.category] || [item.category];
  const { data: existing, error: lookupError } = await supabase.from("media")
    .select("id").in("category", categoryVariants).eq("external_id", item.external_id).limit(1);
  if (lookupError) throw lookupError;
  if (existing?.length) throw new Error("This title is already in your archive.");
  const row = {
    category: item.category, title: item.title, release_year: item.release_year,
    poster_url: item.poster_url, backdrop_url: item.backdrop_url,
    external_id: item.external_id, rating: null, review: null, is_logged: false
  };
  const { data, error } = await supabase.from("media").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateReview(id, rating, review) {
  if (rating !== null && (!Number.isFinite(rating) || rating < 0.5 || rating > 5 || Math.round(rating * 2) !== rating * 2)) {
    throw new Error("Rating must be from 0.5 to 5 in half-star increments.");
  }
  const { data, error } = await supabase.from("media")
    .update({ rating, review: review.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id).select("id").single();
  if (error) throw error;
  return data;
}

export async function deleteMedia(id) {
  const { data, error } = await supabase.from("media").delete().eq("id", id).select("id").single();
  if (error) throw error;
  return data;
}