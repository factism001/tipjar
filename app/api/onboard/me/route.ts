import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/require-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/onboard/me — creator dashboard data for the signed-in email.
 * Auth: Bearer Supabase access token. Returns creator + tips + totals.
 */
export async function GET(req: NextRequest) {
  let email: string, svc: ReturnType<typeof import('@/lib/supabase').createClient>;
  try {
    ({ email, svc } = await requireUser(req));
  } catch (res) {
    return res as NextResponse;
  }

  const { data: creator } = await svc
    .from('creators')
    .select('id, handle, display_name, bank_account, bank_code, paystack_subaccount_code, created_at')
    .eq('email', email)
    .maybeSingle();
  if (!creator) return NextResponse.json({ creator: null });

  const { data: tips } = await svc
    .from('tips')
    .select('id, amount, net_amount, tipper_name, is_anonymous, message, status, created_at, thank_you_message, thanked_at')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const paid = (tips || []).filter((t: any) => t.status === 'success');
  // Creator-facing totals = what the creator nets (fan-covered fee excluded)
  const total = paid.reduce((s: number, t: any) => s + (t.net_amount ?? t.amount ?? 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = paid.filter((t: any) => (t.created_at || '').slice(0, 10) === today).length;

  return NextResponse.json({
    creator: { ...creator, bank_account: creator.bank_account ? `****${creator.bank_account.slice(-4)}` : null },
    tips: tips || [],
    stats: { total_kobo: total, paid_count: paid.length, today_count: todayCount },
  });
}
