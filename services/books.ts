import { SearchResult } from "@/types";

const OPEN_LIBRARY_API = "https://openlibrary.org/search.json";

export async function searchBooks(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${OPEN_LIBRARY_API}?q=${encodeURIComponent(query)}&limit=10`);
  
  if (!res.ok) throw new Error("Failed to fetch books");

  const data = await res.json();
  const docs = data.docs || [];

  return docs.map((item: any) => {
    const poster_url = item.cover_i 
      ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`
      : null;

    return {
      external_id: item.key ? item.key.replace("/works/", "") : Math.random().toString(),
      title: item.title,
      release_year: item.first_publish_year || null,
      poster_url,
      backdrop_url: null, // Books usually don't have backdrops
      category: "books",
    };
  });
}
