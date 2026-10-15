const ENDPOINT = "https://graphql.anilist.co";
export async function searchAniList(query, signal) {
  const graphqlQuery = `query ($search: String) {
    Page(page: 1, perPage: 10) { media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
      id title { english romaji } seasonYear coverImage { extraLarge } bannerImage
    } }
  }`;
  const response = await fetch(ENDPOINT, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query: graphqlQuery, variables: { search: query } })
  });
  if (!response.ok) throw new Error(`AniList request failed (${response.status})`);
  const payload = await response.json();
  return (payload.data?.Page?.media || []).map(item => ({
    external_id: String(item.id), title: item.title?.english || item.title?.romaji || "Untitled",
    release_year: item.seasonYear || null, poster_url: item.coverImage?.extraLarge || null,
    backdrop_url: item.bannerImage || null, category: "anime"
  }));
}