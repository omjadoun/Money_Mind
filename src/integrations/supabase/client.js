// src/supabase/client.js
import { createClient } from "@supabase/supabase-js";

// Prefer env vars, but provide local development fallbacks to keep the app running
const DEFAULT_SUPABASE_URL = "https://wqjmhspderdpgqbeyxit.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxam1oc3BkZXJkcGdxYmV5eGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTAwMTgsImV4cCI6MjA3Mzg4NjAxOH0.QEqd_vwhpySh5SOeb4Ck6V2XDo_hCEDrgNnqYCjzOSI";

// Read env with flexible fallbacks so either var name works, then fallback to defaults
const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY?.trim() ||
  DEFAULT_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Provide a clearer diagnostic to help during local setup
  console.error(
    "Supabase URL or Anon Key is missing. Expected VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY in .env"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
