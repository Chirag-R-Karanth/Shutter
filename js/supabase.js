import { config } from "./config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

if (!config?.supabaseUrl || !config?.supabaseAnonKey ||
    config.supabaseUrl.includes("YOUR_PROJECT") ||
    config.supabaseAnonKey.includes("YOUR_SUPABASE")) {
  console.warn("Configure js/config.js before using Supabase features.");
}

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);