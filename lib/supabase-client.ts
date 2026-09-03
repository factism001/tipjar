import { createClient } from '@supabase/supabase-js';

// Browser Supabase client — persisted session for email OTP.
// NEXT_PUBLIC_* vars are baked at build; Vercel prod already has them.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = () =>
  createClient(URL, ANON, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

/** Current access token for authenticated API calls (Bearer). */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabaseBrowser().auth.getSession();
  return data.session?.access_token || null;
}

/** Sign out everywhere (used when switching accounts). */
export async function signOut() {
  await supabaseBrowser().auth.signOut();
}
