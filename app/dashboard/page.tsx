"use client";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import RealtimeTable from "@/components/RealtimeTable";
import { getAccessToken, signOut } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

type Creator = { handle: string; bank_account: string | null; paystack_subaccount_code: string | null };
type Tip = { id: string; amount: number; tipper: string; is_anonymous: boolean; created_at: string; message?: string };

export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [stats, setStats] = useState({ total_kobo: 0, paid_count: 0, today_count: 0 });
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) { setLoading(false); return; }
      const res = await fetch("/api/onboard/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.creator) {
        setCreator(j.creator);
        setTips(
          (j.tips || []).map((t: any) => ({
            id: String(t.id),
            amount: t.net_amount ?? t.amount ?? 0,
            tipper: t.is_anonymous ? "anonymous" : t.tipper_name || "tipper",
            is_anonymous: !!t.is_anonymous,
            created_at: t.created_at,
            message: t.message || "",
          }))
        );
        setStats(j.stats || { total_kobo: 0, paid_count: 0, today_count: 0 });
      } else {
        setCreator(null);
      }
    } catch {
      setCreator(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (authed) load(); }, [authed]);

  const totalN = (stats.total_kobo / 100).toLocaleString("en-NG");

  return (
    <AuthGuard onVerified={() => setAuthed(true)}>
      <div className="pt-4 w-full min-w-0">
        {loading ? (
          <p className="pt-16 text-center text-sm text-anon-gray">Loading dashboard</p>
        ) : !creator ? (
          <div className="pt-8 text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-charcoal">No handle yet</h1>
            <p className="mt-1 text-sm text-anon-gray">Claim your handle to start receiving tips.</p>
            <a href="/onboard" className="mt-6 inline-flex min-h-[48px] items-center rounded-md bg-brand-blue px-6 text-sm font-semibold text-white">Claim handle</a>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-extrabold tracking-tight text-charcoal">@{creator.handle}</h1>
              <button
                onClick={async () => { await signOut(); window.location.reload(); }}
                className="text-xs font-semibold text-anon-gray min-h-[44px] px-2"
              >
                Sign out
              </button>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 rounded-lg bg-brand-ink text-white p-4 min-w-0">
                <p className="text-xs opacity-70">Total raised</p>
                <p className="text-lg sm:text-xl font-bold truncate font-mono tnum">₦{totalN}</p>
              </div>
              <div className="flex-1 rounded-lg bg-white border border-slate-line p-4 min-w-0">
                <p className="text-xs text-anon-gray">Tips today</p>
                <p className="text-lg sm:text-xl font-bold font-mono tnum">{stats.today_count}</p>
              </div>
              <div className="flex-1 rounded-lg bg-white border border-slate-line p-4 min-w-0">
                <p className="text-xs text-anon-gray">Payouts to</p>
                <p className="text-lg sm:text-xl font-bold font-mono tnum">{creator.bank_account || "—"}</p>
              </div>
            </div>

            <div className="mt-6 w-full min-w-0 rounded-lg border border-slate-line bg-white p-4 sm:p-5">
              <h2 className="text-base font-bold tracking-tight text-charcoal">Your tip QR code</h2>
              <p className="mt-1 text-sm text-anon-gray">Print it for tables, stickers, banners — fans scan and land straight on your tip page.</p>
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/creator/${encodeURIComponent(creator.handle)}/qr?size=512`}
                  alt={`Tip QR code for @${creator.handle}`}
                  width={160}
                  height={160}
                  className="h-40 w-40 rounded-md border border-slate-line"
                />
                <div className="w-full min-w-0 flex-1 space-y-3">
                  <p className="text-sm font-mono font-semibold text-charcoal break-all tnum">
                    {(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '') || 'tipjar-gray.vercel.app'}/@{creator.handle}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/creator/${encodeURIComponent(creator.handle)}/qr?size=1024`);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `tipjar-@${creator.handle}-qr.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex min-h-[48px] flex-1 items-center justify-center rounded-md bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-[#0046CC]"
                    >
                      Download print QR
                    </button>
                    <button
                      onClick={async () => {
                        const link = `${window.location.origin}/@${creator.handle}`;
                        try { await navigator.clipboard.writeText(link); } catch {
                          const ta = document.createElement('textarea');
                          ta.value = link; document.body.appendChild(ta); ta.select();
                          document.execCommand('copy'); ta.remove();
                        }
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex min-h-[48px] flex-1 items-center justify-center rounded-md border border-slate-line px-4 text-sm font-semibold text-charcoal"
                    >
                      {copied ? 'Copied' : 'Copy tip link'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 w-full min-w-0">
              <RealtimeTable initialTips={tips} />
            </div>

            <button
              onClick={() => {
                const rows = [["amount_kobo", "tipper", "date"], ...tips.map((t) => [String(t.amount), t.tipper, t.created_at])];
                const csv = rows.map((r) => r.join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "tips.csv"; a.click(); URL.revokeObjectURL(url);
              }}
              className="fixed bottom-6 right-4 sm:right-6 z-30 inline-flex min-h-[44px] items-center rounded-md bg-charcoal px-5 text-sm font-semibold text-white shadow-md hover:bg-black max-w-[45vw] truncate"
            >
              Export CSV
            </button>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
