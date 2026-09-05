import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/require-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/thanks — creator posts a public thank-you on one of their tips.
 * Auth: Bearer Supabase access token. Body: { tip_id, message }
 */
export async function POST(req: NextRequest) {
  let email: string, svc: ReturnType<typeof import('@/lib/supabase').createClient>;
  try {
    ({ email, svc } = await requireUser(req));
  } catch (res) {
    return res as NextResponse;
  }
  const body = await req.json().catch(() => ({}));
  const tipId = String(body.tip_id || '');
  const message = String(body.message || '').slice(0, 280).trim();
  if (!tipId) return NextResponse.json({ error: 'Missing tip_id' }, { status: 400 });
  if (!message) return NextResponse.json({ error: 'Message is empty' }, { status: 400 });

  const { data: creator } = await svc
    .from('creators')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (!creator) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const { data, error } = await svc
    .from('tips')
    .update({ thank_you_message: message, thanked_at: new Date().toISOString() })
    .eq('id', tipId)
    .eq('creator_id', creator.id)
    .eq('status', 'success')
    .select('id, thank_you_message, thanked_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Update failed', detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
  return NextResponse.json({ ok: true, thank_you: data });
}
