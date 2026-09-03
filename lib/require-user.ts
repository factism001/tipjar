import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Verify Supabase access token → user email. Throws Response on failure. */
export async function requireUser(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const svc = createClient('service_role');
  const { data, error } = await svc.auth.getUser(token);
  if (error || !data?.user?.email) {
    throw NextResponse.json({ error: 'Session expired — sign in again' }, { status: 401 });
  }
  return { email: data.user.email.toLowerCase(), svc };
}
