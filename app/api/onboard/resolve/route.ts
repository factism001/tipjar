import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/require-user';
import { resolveBankAccount } from '@/lib/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  account_number: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
  bank_code: z.string().min(3).max(6),
});

/**
 * POST /api/onboard/resolve — verify bank account belongs to a real name.
 * Auth: Bearer Supabase access token (email OTP verified).
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
  } catch (res) {
    return res as NextResponse;
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.issues?.[0]?.message || 'Invalid account details' },
      { status: 400 }
    );
  }
  try {
    const r = await resolveBankAccount(body.account_number, body.bank_code);
    return NextResponse.json({ account_name: r.account_name });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Could not verify this account — check the number and bank' },
      { status: 400 }
    );
  }
}
