import { SearchResult } from "@/types";

const IGDB_CLIENT_ID = process.env.NEXT_PUBLIC_IGDB_CLIENT_ID;
const IGDB_ACCESS_TOKEN = process.env.NEXT_PUBLIC_IGDB_ACCESS_TOKEN;
const IGDB_URL = "https://api.igdb.com/v4/games";

export async function searchGames(query: string): Promise<SearchResult[]> {
  if (!IGDB_CLIENT_ID || !IGDB_ACCESS_TOKEN) {
    throw new Error("IGDB credentials are missing");
  }

  // Use a proxy or server action in production to avoid CORS and exposing tokens,
  // but for the sake of the API logic, this is the body.
  const body = `
    search "${query}";
    fields name, first_release_date, cover.image_id, artworks.image_id;
    limit 10;
  `;

  const res = await fetch(IGDB_URL, {
    method: "POST",
    headers: {
      "Client-ID": IGDB_CLIENT_ID,
      "Authorization": `Bearer ${IGDB_ACCESS_TOKEN}`,
      "Accept": "application/json",
    },
    body,
  });

  if (!res.ok) throw new Error("Failed to fetch games");

  const data = await res.json();

  return data.map((item: any) => {
    const release_year = item.first_release_date 
      ? new Date(item.first_release_date * 1000).getFullYear() 
      : null;
      
    // IGDB image IDs can be formatted via their image URL structure
    // cover_big or 1080p are standard sizes
    const poster_url = item.cover?.image_id 
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.jpg` 
      : null;

    const backdrop_url = item.artworks?.[0]?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_1080p/${item.artworks[0].image_id}.jpg`
      : null;

    return {
      external_id: item.id.toString(),
      title: item.name,
      release_year,
      poster_url,
      backdrop_url,
      category: "games",
    };
  });
}
