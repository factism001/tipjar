import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/creator/[handle] — public profile
 * Uses anon client (RLS: public_select_creators/videos).
 * Returns safe columns only (no bank_account, bank_code, phone).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { handle: string } }
) {
  const rawHandle = params.handle;
  if (!rawHandle) return NextResponse.json({ error: 'Missing handle' }, { status: 400 });

  // Normalize: strip @, lowercase
  const handle = rawHandle.replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._]{1,64}$/i.test(handle)) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
  }

  const supabase = createClient('anon');

  const { data: creator, error } = await supabase
    .from('creators')
    .select('id, handle, display_name, avatar_url, tiktok_id, created_at')
    .ilike('handle', handle)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Lookup failed', detail: error.message }, { status: 500 });
  }
  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Published videos for this creator
  const { data: videos, error: vErr } = await supabase
    .from('videos')
    .select('id, tiktok_video_id, tiktok_url, caption, thumbnail_url, tip_page_slug, detected_at, view_count')
    .eq('creator_id', creator.id)
    .order('detected_at', { ascending: false })
    .limit(30);

  if (vErr) {
    // Return creator even if videos fail
    return NextResponse.json({ creator, videos: [], warning: 'Videos lookup failed' }, { status: 200 });
  }

  // Recent successful tips (public-safe: anon masked, no emails) via service_role
  let recent_tips: any[] = [];
  try {
    const svc = createClient('service_role');
    const { data: tips } = await svc
      .from('tips')
      .select('id, amount, tipper_name, is_anonymous, message, created_at')
      .eq('creator_id', creator.id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(10);
    recent_tips = (tips || []).map((t: any) => ({
      id: t.id,
      amount: t.amount,
      tipper_name: t.is_anonymous ? 'anon' : t.tipper_name,
      is_anonymous: !!t.is_anonymous,
      message: t.message || '',
      created_at: t.created_at,
    }));
  } catch {}

  return NextResponse.json(
    {
      creator,
      videos: videos || [],
      recent_tips,
    },
    {
      status: 200,
      headers: {
        // Cache public profile briefly at edge
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
