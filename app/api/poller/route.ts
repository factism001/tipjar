import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import {
  fetchTikTokProfileViaSigi,
  fetchVideosViaDisplayAPI,
  PARSER_VERSION,
} from '@/lib/tiktok';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/poller — Vercel Cron / manual trigger
 * - Auth: x-cron-secret header == CRON_SECRET (or ?secret=) OR vercel cron UA
 * - For each creator in poller_state: fetch tiktok.com/@handle via SIGI_STATE
 * - Zod validated, 800ms stagger + jitter, 429 backoff, canary abort
 * - Fallback: Display API (tiktok_tokens) if SIGI fails
 * - New videos -> insert videos row, update poller_state, Telegram notify
 */

const STAGGER_MS = 800;
const MAX_CREATORS_PER_RUN = 100;
const CANARY_FAIL_THRESHOLD = 0.6; // >60% SIGI failures => abort (parser broken)
const JITTER_MS = 200;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // no secret configured -> allow (dev)
  const h = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '') || '';
  const q = req.nextUrl.searchParams.get('secret') || '';
  if (h === cronSecret || q === cronSecret) return true;
  // Vercel Cron sets user-agent containing vercel
  const ua = req.headers.get('user-agent') || '';
  if (ua.toLowerCase().includes('vercel') && req.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient('service_role');

  // Load creators to poll: join poller_state + creators
  // Order by last_checked_at NULLS FIRST (new creators) then oldest first
  const { data: states, error: stateErr } = await supabase
    .from('poller_state')
    .select('creator_id, last_checked_at, last_video_id, fail_count, creators!inner(handle, display_name)')
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(MAX_CREATORS_PER_RUN);

  if (stateErr) {
    return NextResponse.json({ error: 'Failed to load poller_state', detail: stateErr.message }, { status: 500 });
  }

  if (!states || states.length === 0) {
    return NextResponse.json({ ok: true, polled: 0, message: 'No creators to poll', parserVersion: PARSER_VERSION });
  }

  let sigiFailures = 0;
  let sigiSuccesses = 0;
  const results: Array<{
    handle: string;
    status: string;
    newVideos?: number;
    lastVideoId?: string | null;
    fallback?: boolean;
    error?: string;
  }> = [];
  const newlyDetected: Array<{ handle: string; videoId: string; caption?: string }> = [];

  for (let i = 0; i < states.length; i++) {
    const row: any = states[i];
    const handle: string = row.creators?.handle || row.creator_id;

    // stagger 800ms + jitter between creators (avoid 1.1 rps ban at 1000 creators)
    if (i > 0) {
      const delay = STAGGER_MS + Math.floor(Math.random() * JITTER_MS);
      await sleep(delay);
    }

    // Early canary check after at least 5 attempts
    if (i >= 5) {
      const total = sigiFailures + sigiSuccesses;
      if (total >= 5 && sigiFailures / total > CANARY_FAIL_THRESHOLD) {
        console.warn(`[poller] Canary abort: ${sigiFailures}/${total} SIGI failures — parser may be broken (v${PARSER_VERSION})`);
        // Mark remaining as skipped
        for (let j = i; j < states.length; j++) {
          const h2: string = (states[j] as any).creators?.handle || (states[j] as any).creator_id;
          results.push({ handle: h2, status: 'skipped_canary' });
        }
        break;
      }
    }

    let tiktokResult: Awaited<ReturnType<typeof fetchTikTokProfileViaSigi>> | null = null;
    let usedFallback = false;

    // 1. Try SIGI_STATE scrape
    tiktokResult = await fetchTikTokProfileViaSigi(handle);

    if (tiktokResult.ok) {
      sigiSuccesses++;
    } else {
      // Handle 429 with backoff: wait 5s then retry once
      if (tiktokResult.reason === 'tiktok_429') {
        console.warn(`[poller] 429 for @${handle} — backing off 5s`);
        await sleep(5000 + Math.floor(Math.random() * 2000));
        const retry = await fetchTikTokProfileViaSigi(handle);
        if (retry.ok) {
          sigiSuccesses++;
          tiktokResult = retry;
        } else {
          sigiFailures++;
          tiktokResult = retry;
        }
      } else {
        sigiFailures++;
      }
    }

    // 2. Fallback to Display API if SIGI failed and token exists
    let profile: NonNullable<Extract<Awaited<ReturnType<typeof fetchTikTokProfileViaSigi>>, { ok: true }>>['profile'] | null = null;
    let pattern: string | undefined;

    if (tiktokResult && tiktokResult.ok) {
      profile = tiktokResult.profile;
      pattern = (tiktokResult as any).pattern;
    } else {
      // try Display API
      const { data: tokenRow } = await supabase
        .from('tiktok_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('creator_id', row.creator_id)
        .maybeSingle();

      if (tokenRow?.access_token) {
        const fb = await fetchVideosViaDisplayAPI(tokenRow.access_token, handle);
        if (fb.ok) {
          profile = fb.profile;
          pattern = (fb as any).pattern;
          usedFallback = true;
          // SIGI failure but fallback succeeded — don't count as poller failure for canary? keep tracking separately
        }
      }
    }

    if (!profile) {
      // total failure — bump fail_count
      await supabase
        .from('poller_state')
        .update({ last_checked_at: new Date().toISOString(), fail_count: (row.fail_count || 0) + 1 })
        .eq('creator_id', row.creator_id);

      results.push({
        handle,
        status: 'failed',
        error: (tiktokResult as any)?.reason || 'no_profile',
        fallback: usedFallback,
      });
      continue;
    }

    // 3. Diff videos vs last_video_id
    const remoteIds = profile.videos.map((v) => v.id);
    const lastSeen = row.last_video_id as string | null;
    let newVideos: typeof profile.videos = [];

    if (!lastSeen) {
      // first poll — treat most recent as baseline (don't spam for historic videos)
      // Only consider 1 newest as "new" if you want Telegram on first detection? We treat none as new on first run.
      newVideos = [];
    } else {
      const idx = remoteIds.indexOf(lastSeen);
      if (idx === -1) {
        // last seen not in current feed (maybe deleted or pagination) — treat videos newer than last check? heuristic: all
        // Safer: take up to 3 newest as new (cap spam)
        newVideos = profile.videos.slice(0, 3);
      } else if (idx > 0) {
        newVideos = profile.videos.slice(0, idx);
      }
    }

    const newestId = remoteIds[0] || lastSeen;

    // 4. Insert new videos
    let inserted = 0;
    for (const v of newVideos) {
      const cover = (v as any).video?.cover || (v as any).cover || null;
      const caption: string | null = (v as any).desc || null;
      const createTime: string | null = (v as any).createTime ? new Date(((v as any).createTime as number) * 1000).toISOString() : null;

      const { error: insErr } = await supabase.from('videos').upsert(
        {
          tiktok_video_id: v.id,
          creator_id: row.creator_id,
          caption,
          thumbnail_url: cover,
          tip_page_slug: v.id, // unique slug per video
          detected_at: createTime || new Date().toISOString(),
        },
        { onConflict: 'tiktok_video_id', ignoreDuplicates: false }
      );
      if (!insErr) {
        inserted++;
        newlyDetected.push({ handle, videoId: v.id, caption: caption || undefined });
      } else {
        console.warn(`[poller] video upsert failed @${handle} ${v.id}: ${insErr.message}`);
      }
    }

    // Also ensure newest video exists even if not "new" (covers first poll baseline)
    if (remoteIds.length > 0 && !lastSeen) {
      const v = profile.videos[0];
      const cover = (v as any).video?.cover || null;
      await supabase.from('videos').upsert(
        {
          tiktok_video_id: v.id,
          creator_id: row.creator_id,
          caption: (v as any).desc || null,
          thumbnail_url: cover,
          tip_page_slug: v.id,
          detected_at: new Date().toISOString(),
        },
        { onConflict: 'tiktok_video_id', ignoreDuplicates: true }
      );
    }

    // 5. Update poller_state
    await supabase
      .from('poller_state')
      .update({
        last_checked_at: new Date().toISOString(),
        last_video_id: newestId,
        fail_count: 0,
      })
      .eq('creator_id', row.creator_id);

    results.push({
      handle,
      status: inserted > 0 ? 'new_videos' : 'ok',
      newVideos: inserted,
      lastVideoId: newestId,
      fallback: usedFallback,
    });
  }

  // 6. Telegram summary for new detections
  if (newlyDetected.length > 0) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || '-1004327966772';
    if (token) {
      const lines = newlyDetected.slice(0, 10).map((d) => `• @${d.handle} — ${d.videoId} ${d.caption ? `“${d.caption.slice(0, 60)}”` : ''}`);
      const text = `[poller v${PARSER_VERSION}] ${newlyDetected.length} new video(s)\n` + lines.join('\n');
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    ok: true,
    parserVersion: PARSER_VERSION,
    polled: results.length,
    sigiSuccesses,
    sigiFailures,
    canaryAborted: sigiFailures + sigiSuccesses >= 5 && sigiFailures / (sigiFailures + sigiSuccesses) > CANARY_FAIL_THRESHOLD,
    newlyDetected: newlyDetected.length,
    results,
  });
}
