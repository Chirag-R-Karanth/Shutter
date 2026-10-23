// Copy this file to js/config.js for local setup.
// Values in a browser module are visible to users. Never include Supabase service-role
// keys, Twitch client secrets, or IGDB access tokens here.
export const config = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY",
  // Empty by default. Prefer a small server-side proxy for TMDB.
  // Only set this if browser exposure of this specific TMDB key is acceptable.
  tmdbApiKey: "",
  // Local proxy provided by dev_server.py. Use your deployed proxy URL when hosting.
  igdbProxyUrl: "/api/igdb"
};