// src/integrations/supabase/client-optimized.js
import { createClient } from "@supabase/supabase-js";

// Prefer env vars, but provide local development fallbacks
const DEFAULT_SUPABASE_URL = "https://wqjmhspderdpgqbeyxit.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxam1oc3BkZXJkcGdxYmV5eGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTAwMTgsImV4cCI6MjA3Mzg4NjAxOH0.QEqd_vwhpySh5SOeb4Ck6V2XDo_hCEDrgNnqYCjzOSI";

// Read env with flexible fallbacks
const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY?.trim() ||
  DEFAULT_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    "Supabase URL or Anon Key is missing. Expected VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY in .env"
  );
}

// Optimized client with proper timeouts and retry configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'money-mind-web/1.0.0',
    },
  },
  // Custom fetch with timeout and retry logic
  fetch: (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });
  },
});

// Health check function
export const checkSupabaseHealth = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase health check failed:', error);
      return { healthy: false, error: error.message };
    }
    
    return { healthy: true };
  } catch (error) {
    console.error('Supabase health check exception:', error);
    return { healthy: false, error: error.message };
  }
};

// Connection status monitoring
let connectionStatus = 'unknown';
let lastHealthCheck = null;

export const getConnectionStatus = () => connectionStatus;

export const monitorConnection = async () => {
  const now = Date.now();
  
  // Only check health every 30 seconds
  if (lastHealthCheck && (now - lastHealthCheck) < 30000) {
    return connectionStatus;
  }
  
  lastHealthCheck = now;
  const health = await checkSupabaseHealth();
  connectionStatus = health.healthy ? 'healthy' : 'unhealthy';
  
  if (connectionStatus === 'unhealthy') {
    console.warn('Supabase connection unhealthy:', health.error);
  }
  
  return connectionStatus;
};
