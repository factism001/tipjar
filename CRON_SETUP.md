# TipJar External Cron (15m) — bypass Vercel Hobby daily limit

Vercel Hobby only allows `0 0 * * *` daily. For true 15m detection:
1. Go https://cron-job.org → Create cronjob
2. URL: https://tipjar-gray.vercel.app/api/poller
3. Schedule: Every 15 minutes
4. Headers: `x-cron-secret: <CRON_SECRET>`
5. Method: GET
Set Vercel env `CRON_SECRET` = random 32 chars (e.g. `openssl rand -hex 16`)
Then update Vercel env and set cron-job.org secret same value.

When domain tipjar.ng live, change URL to https://tipjar.ng/api/poller
