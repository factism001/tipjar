import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/health — uptime monitor target. No secrets, no DB ping (cheap). */
export async function GET() {
  return NextResponse.json(
    { ok: true, app: 'tipjar', commit: 'c9b1d3cf', time: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
