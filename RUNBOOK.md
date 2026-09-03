# TipJar Runbook (pre-live)

## Deploy
- `npm run build` must pass → `npx vercel --prod --yes` → alias `tipjar-gray.vercel.app`
- GitHub `factism001/tipjar` main mirrors every prod deploy. CI runs `npm run build` on push.

## Env (Vercel prod, encrypted — never in repo)
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY /
PAYSTACK_SECRET_KEY (sk_test until live) / NEXT_PUBLIC_SITE_URL + SITE_URL / CRON_SECRET

## Poller (15m)
- Vercel Hobby cron is daily-only. True 15m via cron-job.org:
  `GET https://tipjar-gray.vercel.app/api/poller` header `x-cron-secret: <CRON_SECRET>`
- No TikTok API keys needed for V1 (public SIGI poll). Display API is V2 (scale).

## Monitoring
- Uptime: ping `GET /api/health` (expect `{ok:true}`) every 5m + `/` every 5m.
- Paystack Dashboard → Transactions + Webhooks (`/api/paystack/webhook` 200 rate).
- Supabase → Table Editor `tips` (pending → success), Logs.

## Incidents
- Webhook 500: check `PAYSTACK_SECRET_KEY` + `upsert_tip_from_webhook` + amount-mismatch 400s.
- Tips 429 spike: legitimate (10/min/IP) vs Paystack test sandbox 502 (retry, live has higher limits).
- Rate-limit fail-open: DB blip logs warn + allows — check Supabase status.

## Pre-live cutover (funds ready)
1. Buy `tipjar.ng` → Vercel Domains → set SITE_URLs → redeploy.
2. Paystack `sk_live` → Vercel env → redeploy → `₦100` live tip to Opay → verify Split 90/10.
3. Wipe test tips: `DELETE FROM tips WHERE paystack_ref LIKE 'TJR_%'`.
4. Real OTP: Supabase Auth email templates + remove AuthGuard stub.
