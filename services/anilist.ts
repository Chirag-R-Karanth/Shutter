import { SearchResult } from "@/types";

const ANILIST_URL = "https://graphql.anilist.co";

export async function searchAnime(query: string): Promise<SearchResult[]> {
  const graphqlQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          title {
            english
            romaji
          }
          seasonYear
          coverImage {
            extraLarge
          }
          bannerImage
        }
      }
    }
  `;

  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: graphqlQuery,
      variables: { search: query },
    }),
  });

  if (!res.ok) throw new Error("Failed to fetch anime");

  const { data } = await res.json();
  const media = data?.Page?.media || [];

  return media.map((item: any) => ({
    external_id: item.id.toString(),
    title: item.title.english || item.title.romaji,
    release_year: item.seasonYear || null,
    poster_url: item.coverImage?.extraLarge || null,
    backdrop_url: item.bannerImage || null,
    category: "anime",
  }));
}
