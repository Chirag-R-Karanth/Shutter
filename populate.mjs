import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
const envVars = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2];
  return acc;
}, {});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

function parseCSV(text) {
  const result = [];
  let row = [];
  let inQuotes = false;
  let val = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { val += '"'; i++; }
        else { inQuotes = false; }
      } else {
        val += char;
      }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { row.push(val); val = ''; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        row.push(val); val = '';
        if (row.length > 1 || row[0]) result.push(row);
        row = [];
      } else {
        val += char;
      }
    }
  }
  if (val || row.length) { row.push(val); result.push(row); }
  return result;
}

const csvRaw = fs.readFileSync('data.csv', 'utf8');
const rows = parseCSV(csvRaw);
const dataRows = rows.slice(1).filter(r => r.length > 1 && r[0].trim());

async function search(category, query) {
  try {
    if (category === 'movies') {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${envVars.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&page=1`);
      const data = await res.json();
      if (data.results?.[0]) {
        const item = data.results[0];
        return {
          external_id: item.id.toString(),
          title: item.title,
          release_year: item.release_date ? parseInt(item.release_date.substring(0, 4)) : null,
          poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          backdrop_url: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
          category: 'movies',
        };
      }
    } else if (category === 'tv') {
      const res = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${envVars.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&page=1`);
      const data = await res.json();
      if (data.results?.[0]) {
        const item = data.results[0];
        return {
          external_id: item.id.toString(),
          title: item.name,
          release_year: item.first_air_date ? parseInt(item.first_air_date.substring(0, 4)) : null,
          poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          backdrop_url: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
          category: 'tv',
        };
      }
    } else if (category === 'books') {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data.docs?.[0]) {
        const item = data.docs[0];
        return {
          external_id: item.key ? item.key.replace("/works/", "") : Math.random().toString(),
          title: item.title,
          release_year: item.first_publish_year || null,
          poster_url: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
          backdrop_url: null,
          category: 'books',
        };
      }
    } else if (category === 'games') {
      const body = `search "${query}"; fields name, first_release_date, cover.image_id, artworks.image_id; limit 1;`;
      const res = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": envVars.NEXT_PUBLIC_IGDB_CLIENT_ID,
          "Authorization": `Bearer ${envVars.NEXT_PUBLIC_IGDB_ACCESS_TOKEN}`,
          "Accept": "application/json",
        },
        body,
      });
      const data = await res.json();
      if (data?.[0]) {
        const item = data[0];
        return {
          external_id: item.id.toString(),
          title: item.name,
          release_year: item.first_release_date ? new Date(item.first_release_date * 1000).getFullYear() : null,
          poster_url: item.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.jpg` : null,
          backdrop_url: item.artworks?.[0]?.image_id ? `https://images.igdb.com/igdb/image/upload/t_1080p/${item.artworks[0].image_id}.jpg` : null,
          category: 'games',
        };
      }
    } else if (category === 'anime') {
      const ANILIST_QUERY = `
        query ($search: String) {
          Page(page: 1, perPage: 1) {
            media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
              id title { romaji english }
              startDate { year }
              coverImage { large }
              bannerImage
            }
          }
        }
      `;
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: ANILIST_QUERY, variables: { search: query } })
      });
      const data = await res.json();
      if (data.data?.Page?.media?.[0]) {
        const item = data.data.Page.media[0];
        return {
          external_id: item.id.toString(),
          title: item.title.english || item.title.romaji,
          release_year: item.startDate?.year || null,
          poster_url: item.coverImage?.large || null,
          backdrop_url: item.bannerImage || null,
          category: "anime",
        };
      }
    }
  } catch (e) {
    console.error('Error searching for', query, e);
  }
  return null;
}

const mapCategory = {
  'Book': 'books',
  'TV Show': 'tv',
  'Movie': 'movies',
  'Anime': 'anime',
  'Podcast': 'podcasts',
  'Games': 'games'
};

async function run() {
  console.log(`Starting import of ${dataRows.length} items...`);
  
  for (const row of dataRows) {
    const title = row[0];
    const catRaw = row[1];
    const review = row[4];
    const category = mapCategory[catRaw] || 'movies';
    
    console.log(`Processing: ${title} (${category})`);
    
    let mediaData = await search(category, title);
    if (!mediaData) {
      mediaData = {
        external_id: Math.random().toString(),
        title: title,
        release_year: null,
        poster_url: null,
        backdrop_url: null,
        category: category,
      };
    }
    
    const singularCategory = category.endsWith("s") && category !== "tv" ? category.slice(0, -1) : category;
    
    const { data: existing } = await supabase.from('media').select('id').eq('title', mediaData.title).maybeSingle();
    if (existing) {
      console.log(`Skipping: ${title} (already exists)`);
      continue;
    }

    const { error } = await supabase.from('media').insert([{
      category: singularCategory,
      title: mediaData.title,
      release_year: mediaData.release_year,
      poster_url: mediaData.poster_url,
      backdrop_url: mediaData.backdrop_url,
      external_id: mediaData.external_id,
      is_logged: true,
      rating: row[5] === 'Yes' ? 5 : null,
      review: review ? review.trim() : null
    }]);
    
    if (error) {
      console.error(`Failed to insert ${title}:`, error);
    } else {
      console.log(`Inserted: ${title}`);
    }
    
    // Slight delay to respect rate limits
    await new Promise(r => setTimeout(r, 200));
  }
  console.log("Import completed!");
}

run();
