"use server";

import { MediaType, SearchResult } from "@/types";
import { searchMedia as fetchSearchMedia } from "@/services";

export async function searchMediaAction(category: MediaType, query: string): Promise<SearchResult[]> {
  try {
    return await fetchSearchMedia(category, query);
  } catch (error) {
    console.error("Search Action Error:", error);
    return [];
  }
}
