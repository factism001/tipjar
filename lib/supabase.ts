import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * TipJar Supabase client factory
 * - 'anon'        -> public reads (creators, videos), rate-limit RPC, anon tip inserts
 * - 'service_role' -> poller, webhook, paystack subaccount updates (bypasses RLS)
 */
export function createClient(role: 'anon' | 'service_role' = 'anon') {
  const key = role === 'service_role' ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error(`Missing Supabase env for role=${role}`);
  }
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Alias for route files that import { createClient } from '@/lib/supabase'
export const supabaseAnon = () => createClient('anon');
export const supabaseServiceRole = () => createClient('service_role');

// Re-export type helper
export type SupabaseClient = ReturnType<typeof createClient>;
