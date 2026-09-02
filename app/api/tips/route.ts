import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';
import { getOrCreateSubaccount, initializeTransaction, generatePaystackRef } from '@/lib/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  creator_handle: z.string().min(1).max(64).optional(),
  creator_id: z.string().uuid().optional(),
  video_id: z.string().regex(/^\d{10,20}$/).optional().nullable(),
  // video FK may be uuid (our DB id) OR tiktok_video_id — accept either; resolve below
  amount: z.number().int().min(100).max(5_000_000), // kobo: ₦1 .. ₦50k
  tipper_email: z.string().email(),
  tipper_name: z.string().max(80).optional().nullable(),
  tipper_handle: z.string().max(64).optional().nullable(),
  message: z.string().max(280).optional().nullable(),
  is_anonymous: z.boolean().optional().default(false),
  callback_url: z.string().url().optional(),
}).refine((v) => v.creator_handle || v.creator_id, {
  message: 'creator_handle or creator_id required',
  path: ['creator_handle'],
});

function getIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

export async function POST(req: NextRequest) {
  const supabaseAnon = createClient('anon');
  const supabaseService = createClient('service_role');
  const ip = getIp(req);

  // 1. Rate limit: 10 req/min/IP (check_rate_limit fn from Phase 2 migration)
  const { data: allowed, error: rlError } = await supabaseAnon.rpc('check_rate_limit', {
    p_key: `tip:${ip}`,
    p_key_type: 'ip',
    p_max_count: 10,
    p_window_seconds: 60,
  });

  if (rlError) {
    console.error('[tips] rate-limit rpc error', rlError.message);
    // fail open? No — fail closed with 500 so Paystack abuse not hidden
    return NextResponse.json({ error: 'Rate limit check failed' }, { status: 500 });
  }
  if (allowed === false) {
    return NextResponse.json({ error: 'Too many requests — try again in a minute' }, { status: 429 });
  }

  // 2. Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { creator_handle, creator_id, video_id, amount, tipper_email, tipper_name, tipper_handle, message, is_anonymous, callback_url } = parsed.data;

  // 3. Resolve creator
  let creator: { id: string; handle: string; display_name: string | null; bank_account: string | null; bank_code: string | null; paystack_subaccount_code: string | null } | null = null;

  if (creator_id) {
    const { data, error } = await supabaseService.from('creators').select('id, handle, display_name, bank_account, bank_code, paystack_subaccount_code').eq('id', creator_id).maybeSingle();
    if (error) return NextResponse.json({ error: 'Creator lookup failed' }, { status: 500 });
    creator = data;
  } else if (creator_handle) {
    const h = creator_handle.replace(/^@/, '').toLowerCase();
    const { data, error } = await supabaseService.from('creators').select('id, handle, display_name, bank_account, bank_code, paystack_subaccount_code').ilike('handle', h).maybeSingle();
    if (error) return NextResponse.json({ error: 'Creator lookup failed' }, { status: 500 });
    creator = data;
  }

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // 4. Resolve video if provided (optional — profile tip if null)
  let videoRowId: string | null = null;
  let tipScope: 'video' | 'profile' = 'profile';
  if (video_id) {
    tipScope = 'video';
    // Try by tiktok_video_id first, then by id (uuid)
    let video: { id: string; creator_id: string } | null = null;
    const byTikTok = await supabaseService.from('videos').select('id, creator_id').eq('tiktok_video_id', video_id).maybeSingle();
    if (byTikTok.data) video = byTikTok.data;
    else {
      // uuid path (if slug is our id)
      const byId = await supabaseService.from('videos').select('id, creator_id').eq('id', video_id).maybeSingle();
      if (byId.data) video = byId.data;
    }
    if (!video) return NextResponse.json({ error: 'Video not found for this creator' }, { status: 404 });
    if (video.creator_id !== creator.id) return NextResponse.json({ error: 'Video does not belong to creator' }, { status: 400 });
    videoRowId = video.id;
  }

  // 5. Get or create Paystack subaccount (lazy, with bank/resolve)
  let subaccountCode: string;
  try {
    subaccountCode = await getOrCreateSubaccount({
      id: creator.id,
      handle: creator.handle,
      display_name: creator.display_name,
      bank_account: creator.bank_account,
      bank_code: creator.bank_code,
      paystack_subaccount_code: creator.paystack_subaccount_code,
      email: tipper_email, // fallback contact
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[tips] subaccount error', msg);
    return NextResponse.json({ error: `Creator payout not configured: ${msg}` }, { status: 502 });
  }

  // 6. Generate unique Paystack reference
  const reference = generatePaystackRef(creator.handle);

  // 7. Initialize Paystack transaction (Split 10%)
  let paystackData: { authorization_url: string; access_code: string; reference: string };
  try {
    paystackData = await initializeTransaction({
      email: tipper_email,
      amount,
      reference,
      subaccount: subaccountCode,
      metadata: {
        creator_id: creator.id,
        creator_handle: creator.handle,
        video_id: videoRowId,
        tip_scope: tipScope,
        tipper_name: tipper_name || null,
        tipper_handle: tipper_handle || null,
        is_anonymous: !!is_anonymous,
        tip_message: message || null,
        // for webhook split calc audit
        amount_kobo: amount,
      },
      callback_url: callback_url || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://tipjar.ng'}/tip/success?ref=${reference}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[tips] paystack init failed', msg);
    return NextResponse.json({ error: 'Payment initialization failed', detail: msg.slice(0, 300) }, { status: 502 });
  }

  // 8. Insert pending tip row (service_role to ensure write despite RLS anon INSERT policy)
  const platformFee = Math.floor(amount * 0.10);
  const netAmount = amount - platformFee;

  const { data: tipRow, error: tipErr } = await supabaseService
    .from('tips')
    .insert({
      paystack_ref: reference,
      creator_id: creator.id,
      video_id: videoRowId,
      amount,
      net_amount: netAmount,
      platform_fee: platformFee,
      tip_scope: tipScope,
      tipper_name: tipper_name || null,
      tipper_handle: tipper_handle || null,
      tipper_email,
      message: message || null,
      is_anonymous: !!is_anonymous,
      status: 'pending',
    })
    .select('id')
    .single();

  if (tipErr) {
    // Paystack already initialized — tip row failure is serious; log and return 500 (avoid double charge orphan)
    console.error('[tips] tip insert failed after paystack init', tipErr.message, { reference });
    // Don't leak paystackData? We should still return auth url so fan can pay; webhook will upsert anyway
    // But signal tip row missing so FE can warn
    return NextResponse.json(
      {
        authorization_url: paystackData.authorization_url,
        access_code: paystackData.access_code,
        reference: paystackData.reference,
        warning: 'Tip record pending — payment still valid',
      },
      { status: 201 }
    );
  }

  return NextResponse.json(
    {
      tip_id: tipRow.id,
      reference,
      authorization_url: paystackData.authorization_url,
      access_code: paystackData.access_code,
      amount,
      net_amount: netAmount,
      platform_fee: platformFee,
      tip_scope: tipScope,
    },
    { status: 201 }
  );
}
