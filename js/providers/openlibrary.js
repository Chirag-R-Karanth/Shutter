export async function searchOpenLibrary(query, signal) {
  const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`, { signal });
  if (!response.ok) throw new Error(`Open Library request failed (${response.status})`);
  const payload = await response.json();
  return (payload.docs || []).map(item => ({
    external_id: String(item.key || "").replace(/^\/works\//, ""),
    title: item.title || "Untitled",
    release_year: item.first_publish_year || null,
    poster_url: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
    backdrop_url: null, category: "books"
  })).filter(item => item.external_id);
}