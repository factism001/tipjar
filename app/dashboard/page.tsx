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
            amount: t.amount || 0,
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
