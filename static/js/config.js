// Public configuration only. These values ship to the browser and are safe:
// the Supabase publishable/anon key is protected by Row Level Security.
// NEVER put the TMDB key or IGDB secret here — those live only in Supabase
// Edge Function secrets.
export const SUPABASE_URL = "https://bnubojykcrhkmswwhnwv.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_qsuVyuBc9ijgWb7nKPaL4A_TlDGljnt";

// Base URL for the metadata proxy functions (Phase 3).
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
