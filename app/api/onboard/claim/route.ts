import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/require-user';
import { resolveBankAccount, getOrCreateSubaccount } from '@/lib/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESERVED = new Set([
  'api', 'tip', 'dashboard', 'onboard', 'terms', 'privacy', 'refunds',
  'icon-192.png', 'icon-512.png', 'manifest.json', 'sw.js', 'favicon.ico', '_next',
]);

const Body = z.object({
  handle: z.string().min(2).max(30),
  bank_code: z.string().min(3).max(6),
  account_number: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
});

/**
 * POST /api/onboard/claim — claim @handle + bank, create creator + Split subaccount.
 * Auth: Bearer Supabase access token (email OTP verified).
 * Beta note: handle ownership (TikTok bio-code check) is manual until V2.
 */
export async function POST(req: NextRequest) {
  let email: string, svc: ReturnType<typeof import('@/lib/supabase').createClient>;
  try {
    ({ email, svc } = await requireUser(req));
  } catch (res) {
    return res as NextResponse;
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.issues?.[0]?.message || 'Check your details and try again' },
      { status: 400 }
    );
  }
  const handle = body.handle.replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._]{2,30}$/.test(handle) || RESERVED.has(handle) || handle.includes('.')) {
    return NextResponse.json({ error: 'That handle cannot be used' }, { status: 400 });
  }

  // Already claimed?
  const { data: existing } = await svc.from('creators').select('id, handle').ilike('handle', handle).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `@${handle} is already claimed` }, { status: 409 });
  }
  // One handle per email for beta
  const { data: mine } = await svc.from('creators').select('id, handle').eq('email', email).maybeSingle();
  if (mine) {
    return NextResponse.json(
      { error: `This email already claimed @${mine.handle}`, handle: mine.handle },
      { status: 409 }
    );
  }

  // Verify bank account resolves
  let accountName: string;
  try {
    const r = await resolveBankAccount(body.account_number, body.bank_code);
    accountName = r.account_name;
  } catch {
    return NextResponse.json(
      { error: 'Could not verify this account — check the number and bank' },
      { status: 400 }
    );
  }

  // Create creator
  const { data: creator, error: insErr } = await svc
    .from('creators')
    .insert({
      handle,
      display_name: handle,
      email,
      bank_account: body.account_number,
      bank_code: body.bank_code,
    })
    .select('id, handle')
    .single();
  if (insErr || !creator) {
    return NextResponse.json({ error: 'Could not save — try again' }, { status: 500 });
  }

  // Split subaccount (90% creator / 10% platform)
  try {
    const code = await getOrCreateSubaccount({
      id: creator.id,
      handle,
      display_name: handle,
      email,
      bank_account: body.account_number,
      bank_code: body.bank_code,
      paystack_subaccount_code: null,
    });
    await svc.from('creators').update({ paystack_subaccount_code: code }).eq('id', creator.id);
  } catch (e: any) {
    // Creator saved, payouts need manual setup — don't fail the claim
    console.warn('[onboard] subaccount failed for @' + handle, e?.message);
    return NextResponse.json({
      handle,
      tip_url: `/@${handle}`,
      account_name: accountName,
      warning: 'Handle claimed, but payouts need manual setup — contact support',
    });
  }

  return NextResponse.json({ handle, tip_url: `/@${handle}`, account_name: accountName });
}
