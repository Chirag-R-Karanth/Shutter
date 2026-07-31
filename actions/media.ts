"use server";

import { supabase } from "@/lib/supabase";
import { MediaItem, MediaType, SearchResult } from "@/types";
import { revalidatePath } from "next/cache";

// Helper to handle singular/plural category mismatch ('movies' vs 'movie')
function getCategoryVariants(category: string): string[] {
  const singular = category.endsWith("s") && category !== "tv" ? category.slice(0, -1) : category;
  const plural = category.endsWith("s") || category === "tv" || category === "anime" ? category : `${category}s`;
  return Array.from(new Set([category, singular, plural]));
}

export async function getMediaByCategory(category: MediaType): Promise<MediaItem[]> {
  const variants = getCategoryVariants(category);
  
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .in("category", variants)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching media:", error.message || error);
    return [];
  }

  return data as MediaItem[];
}

export async function getMediaById(id: string): Promise<MediaItem | null> {
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching media by id:", error.message || error);
    return null;
  }

  return data as MediaItem;
}

export async function addMedia(item: SearchResult) {
  const variants = getCategoryVariants(item.category);
  // Try inserting with first variant, fallback if check constraint triggers
  let lastError: any = null;

  for (const cat of variants) {
    const { data, error } = await supabase
      .from("media")
      .insert([
        {
          category: cat,
          title: item.title,
          release_year: item.release_year,
          poster_url: item.poster_url,
          backdrop_url: item.backdrop_url,
          external_id: item.external_id,
          is_logged: true,
        }
      ])
      .select()
      .single();

    if (!error && data) {
      revalidatePath(`/${item.category}`);
      return data;
    }
    lastError = error;
  }

  console.error("Error adding media after trying category variants:", lastError?.message || lastError);
  throw new Error(lastError?.message || "Could not add media");
}

export async function updateMediaReview(id: string, category: MediaType, rating: number | null, review: string | null) {
  const { error } = await supabase
    .from("media")
    .update({ rating, review, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating media:", error.message || error);
    throw new Error(error.message || "Could not update media");
  }

  revalidatePath(`/${category}`);
  revalidatePath(`/${category}/${id}`);
}

export async function removeMedia(id: string, category: MediaType) {
  const { error } = await supabase
    .from("media")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting media:", error.message || error);
    throw new Error(error.message || "Could not delete media");
  }

  revalidatePath(`/${category}`);
  revalidatePath("/");
}
