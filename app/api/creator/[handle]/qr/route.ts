import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/creator/[handle]/qr — PNG QR code pointing at the creator's tip page.
 * Public (this is the point of QR: print it on table cards, stickers, banners).
 * Query: ?size=1024 (256..2048, default 1024 — print-ready).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { handle: string } }
) {
  const handle = decodeURIComponent(params?.handle ?? '').replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._]{2,30}$/.test(handle)) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
  }

  // 404 for unknown handles so printed QRs never point at dead pages
  const supabase = createClient('anon');
  const { data } = await supabase
    .from('creators')
    .select('handle')
    .ilike('handle', handle)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });

  const sizeParam = Number(new URL(req.url).searchParams.get('size') || 1024);
  const size = Math.min(2048, Math.max(256, Math.floor(sizeParam) || 1024));

  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://tipjar-gray.vercel.app';
  const tipUrl = `${site.replace(/\/$/, '')}/@${(data as { handle: string }).handle}`;

  try {
    const png = await QRCode.toBuffer(tipUrl, {
      width: size,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Disposition': `inline; filename="tipjar-${(data as { handle: string }).handle}-qr.png"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'QR generation failed' }, { status: 500 });
  }
}
