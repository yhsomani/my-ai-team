import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../infra/db/generated/database.types';
export type { Database, Json } from '../../../../infra/db/generated/database.types';

// =============================================================================
// Supabase Client — Resilient Configuration
// =============================================================================
// When the Supabase instance is unreachable (DNS resolution failure,
// maintenance, etc.), the client will be initialized with placeholder
// values. All callers should handle errors gracefully — the lmsService
// and other data layers implement fallback chains.
// =============================================================================

const getEnvVar = (key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY') => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  try {
    if (key === 'VITE_SUPABASE_URL') return import.meta.env.VITE_SUPABASE_URL;
    if (key === 'VITE_SUPABASE_ANON_KEY') return import.meta.env.VITE_SUPABASE_ANON_KEY;
  } catch (e) {
    return undefined;
  }
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Validate URL format to catch obviously invalid configurations early
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.\n' +
    '           The application will use local mock data as a fallback.'
  );
} else if (!isValidUrl(supabaseUrl)) {
  console.warn(
    `[Supabase] Invalid URL format: "${supabaseUrl}". The application will use local mock data as a fallback.`
  );
}

// Create client with validated or placeholder credentials
const effectiveUrl = isValidUrl(supabaseUrl) ? supabaseUrl! : 'https://placeholder.supabase.co';
const effectiveKey = supabaseAnonKey || 'placeholder-key';

export type TalentSphereSupabaseClient = SupabaseClient<Database>;

export const typedSupabase: TalentSphereSupabaseClient = createClient<Database>(effectiveUrl, effectiveKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'talentsphere-frontend',
    },
  },
});

// Legacy/test compatibility export. Production frontend imports should use typedSupabase.
export const supabase: SupabaseClient = typedSupabase as SupabaseClient;

// Export connectivity state for other modules
export const isSupabaseConfigured = isValidUrl(supabaseUrl) && !!supabaseAnonKey;
