import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Last-known-good fallback (updated 2026-09-03). Served with stale:true if live fetch fails.
const FALLBACK = { USD: 1329.17, GBP: 1792.2, EUR: 1539.9 };

let cache: { at: number; rates: typeof FALLBACK } | null = null;
const TTL = 12 * 3600 * 1000; // 12h

/**
 * GET /api/fx — NGN per unit of USD/GBP/EUR. Approx display rates only;
 * Paystack settles the charge in NGN at its own rate.
 */
export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json(
      { rates: cache.rates, stale: false },
      { headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' } }
    );
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'User-Agent': 'TipJar/1.0 (+https://tipjar-gray.vercel.app)' },
      next: { revalidate: 43200 },
    });
    if (!res.ok) throw new Error('fx fetch failed');
    const j = await res.json();
    const ngn = Number(j?.rates?.NGN);
    const gbp = Number(j?.rates?.GBP);
    const eur = Number(j?.rates?.EUR);
    if (!ngn || !gbp || !eur) throw new Error('fx parse failed');
    const rates = { USD: ngn, GBP: ngn / gbp, EUR: ngn / eur };
    cache = { at: Date.now(), rates };
    return NextResponse.json(
      { rates, stale: false },
      { headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json(
      { rates: FALLBACK, stale: true },
      { headers: { 'Cache-Control': 'public, s-maxage=3600' } }
    );
  }
}
