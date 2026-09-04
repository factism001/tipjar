import crypto from 'crypto';
import { createClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/paystack/webhook — Paystack charge.success / charge.failed
 * - HMAC SHA512 + timingSafeEqual (hex vs hex)
 * - Idempotent via upsert_tip_from_webhook RPC
 * - Telegram notify on success
 * - Service role only (bypasses RLS)
 */
export async function POST(req: Request) {
  const supabase = createClient('service_role');

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 401 });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('[webhook] PAYSTACK_SECRET_KEY not set');
    return new Response('Server misconfigured', { status: 500 });
  }

  // HMAC SHA512 of raw body
  const expectedHex = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

  // timingSafeEqual requires equal length buffers
  let isValid = false;
  try {
    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    if (a.length === b.length) {
      isValid = crypto.timingSafeEqual(a, b);
    }
  } catch {
    isValid = false;
  }

  if (!isValid) {
    console.warn('[webhook] HMAC mismatch');
    // Log failed attempt for forensics (no paystack_ref)
    try {
      const payload = JSON.parse(rawBody);
      const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
      await supabase.from('webhook_events').insert({
        paystack_ref: payload?.data?.reference || null,
        payload,
        hmac_valid: false,
        event_type: 'hmac_mismatch',
        ip_address: ip,
      });
    } catch {
      // ignore logging failure
    }
    return new Response('Forbidden', { status: 403 });
  }

  // Parse valid payload
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const eventType: string = event.event;
  const data = event.data;

  if (!['charge.success', 'charge.failed'].includes(eventType)) {
    // Acknowledge but ignore other events (e.g. transfer.success)
    return new Response('Ignored', { status: 200 });
  }

  const reference: string | undefined = data?.reference;
  const amountKobo: number | undefined = data?.amount;
  const ipAddress: string | null = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;

  if (!reference || typeof amountKobo !== 'number') {
    return new Response('Bad payload: missing reference/amount', { status: 400 });
  }

  // Amount guard: 100 kobo .. 6_000_000 kobo (max ₦50k tip grosses to ₦55,556 charge)
  if (amountKobo < 100 || amountKobo > 6_000_000) {
    console.error(`[webhook] Amount out of range: ${amountKobo}`);
    return new Response('Amount out of range', { status: 400 });
  }

  // Optional rate limit on webhook (100/min/IP) — fail open on RPC error
  try {
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_key: `webhook:${ipAddress || 'unknown'}`,
      p_key_type: 'ip',
      p_max_count: 100,
      p_window_seconds: 60,
    });
    if (allowed === false) {
      return new Response('Too Many Requests', { status: 429 });
    }
  } catch {
    // ignore and proceed
  }

  const metadata: Record<string, any> = data?.metadata || {};
  const creatorId: string | undefined = metadata.creator_id || metadata.creatorId;
  const videoId: string | null = metadata.video_id || metadata.videoId || null;
  const tipScope: string = videoId ? 'video' : (metadata.tip_scope || 'profile');
  const isAnonymous: boolean = !!(metadata.is_anonymous ?? metadata.isAnonymous ?? false);

  if (!creatorId) {
    console.error(`[webhook] Missing creator_id in metadata ref=${reference}`);
    return new Response('Missing creator_id', { status: 400 });
  }

  // Validate creator_id is uuid-ish
  if (!/^[0-9a-f-]{36}$/i.test(creatorId)) {
    return new Response('Invalid creator_id', { status: 400 });
  }

  // Map Paystack event to tip status enum
  const tipStatus = eventType === 'charge.success' ? 'success' : 'failed';

  // Resolve video FK: if videoId is a tiktok_video_id, look up uuid; if already uuid, use as-is
  let videoUuid: string | null = null;
  if (videoId) {
    if (/^[0-9a-f-]{36}$/i.test(videoId)) {
      videoUuid = videoId;
    } else if (/^\d{10,20}$/.test(videoId)) {
      const { data: v } = await supabase.from('videos').select('id').eq('tiktok_video_id', videoId).maybeSingle();
      videoUuid = v?.id || null;
    }
  }

  // 7b. Amount cross-check: if pending tip exists, paid amount must match initiated amount
  // Prevents tampered payload where HMAC is valid but amount altered after init
  try {
    const { data: pending } = await supabase.from('tips').select('amount, status').eq('paystack_ref', reference).maybeSingle();
    if (pending && pending.status === 'pending' && pending.amount !== amountKobo) {
      console.error(`[webhook] Amount mismatch ref=${reference} pending=${pending.amount} paid=${amountKobo}`);
      // Log forensic event
      await supabase.from('webhook_events').insert({ paystack_ref: reference, payload: event, hmac_valid: true, event_type: 'amount_mismatch', amount_kobo: amountKobo, ip_address: ipAddress });
      return new Response('Amount mismatch', { status: 400 });
    }
  } catch (e) {
    console.warn('[webhook] amount verify lookup failed', e);
  }

  // Idempotent upsert via RPC (handles ON CONFLICT + suspicious retry logic)
  const { data: result, error } = await supabase.rpc('upsert_tip_from_webhook', {
    p_paystack_ref: reference,
    p_amount_kobo: amountKobo,
    p_creator_id: creatorId,
    p_video_id: videoUuid,
    p_tipper_name: metadata.tipper_name || data?.customer?.name || null,
    p_tipper_handle: metadata.tipper_handle || data?.customer?.email?.split('@')[0] || null,
    p_tipper_email: data?.customer?.email || null,
    p_message: metadata.tip_message || metadata.message || null,
    p_is_anonymous: isAnonymous,
    p_tip_scope: tipScope,
    p_event_type: tipStatus,
    p_ip_address: ipAddress,
    p_payload: event,
  });

  if (error) {
    console.error('[webhook] upsert_tip_from_webhook failed', error.message, error.details);
    return new Response('Upsert failed', { status: 500 });
  }

  // Notify Telegram on success (non-blocking, best-effort)
  if (tipStatus === 'success') {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || '-1004327966772';
    if (token) {
      const row = Array.isArray(result) ? result[0] : result;
      const net = (row?.net_amount ?? Math.floor(amountKobo * 0.9));
      const text =
        `[TipJar] Tip received ✓\n` +
        `Ref: ${reference}\n` +
        `Creator: ${creatorId.slice(0, 8)}…\n` +
        `Fan paid: ₦${(amountKobo / 100).toLocaleString('en-NG')}\n` +
        `Creator nets: ₦${(net / 100).toLocaleString('en-NG')}\n` +
        `Status: ${tipStatus}`;
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      }).catch((e) => console.warn('[webhook] telegram notify failed', e));
    }
  }

  return new Response('OK', { status: 200 });
}
