import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/geo — visitor country from Vercel edge header (no lookup needed). */
export async function GET() {
  const h = headers();
  const country =
    h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || null;
  return NextResponse.json(
    { country },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
