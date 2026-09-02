"use client";
import { useEffect, useState } from "react";
import ShimmerCard from "@/components/ShimmerCard";

export const dynamic = "force-dynamic";

type TipRow = { id: string; amount: number; tipper: string; is_anonymous: boolean; created_at: string; message: string };

const MOCK_TIPS: TipRow[] = [
  { id: "1", amount: 5000, tipper: "anon", is_anonymous: true, created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), message: "Omo, this hit different 🔥" },
  { id: "2", amount: 2000, tipper: "@bobway", is_anonymous: false, created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), message: "Keep am going!" },
];

const RESERVED = new Set(["icon-192.png","icon-512.png","manifest.json","sw.js","favicon.ico","api","tip","dashboard","_next"]);
export default function ProfilePage({ params }: { params: { handle: string } }) {
  const rawHandle = decodeURIComponent(params?.handle ?? "ayo_jazz");
  const isReserved = RESERVED.has(rawHandle.replace(/^@/, "")) || rawHandle.includes(".");
  const handle = rawHandle.replace(/^@/, "");
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<TipRow[]>([]);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/creator/${encodeURIComponent(handle)}`);
        if (res.ok) {
          const j = await res.json();
          if (cancelled) return;
          const apiTips = (j.recent_tips ?? []).map((x: any, i: number) => ({
            id: String(x.id ?? i),
            amount: x.amount ?? 0,
            tipper: x.is_anonymous ? "anon" : (x.tipper_name ?? "tipper"),
            is_anonymous: !!x.is_anonymous,
            created_at: x.created_at ?? new Date().toISOString(),
            message: x.message ?? "",
          }));
          setTips(apiTips.length ? apiTips : []);
          setLoading(false); return;
        }
      } catch {}
      if (!cancelled) { setTips([]); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [handle]);

  if (isReserved) {
    return <div className="pt-8 text-center"><p className="text-sm text-red-600">Not found</p><a href="/" className="mt-4 inline-block text-brand-blue">Go home</a></div>;
  }
  return (
    <div className="pt-4">
      <div className="relative h-[200px] w-full overflow-hidden rounded-xl bg-[#F3F4F6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://picsum.photos/seed/${handle}/360/200`} alt={`${handle} cover`} width={360} height={200} className="h-full w-full object-cover" />
        {loading && <div className="absolute inset-0 shimmer-bg opacity-60"><span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" /></div>}
      </div>

      <div className="mt-3 flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 rounded-full border-4 border-white shadow-sm overflow-hidden bg-anon-gray/20 flex items-center justify-center -mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://picsum.photos/seed/av-${handle}/80/80`} alt={handle} width={80} height={80} className="h-full w-full object-cover" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-charcoal">@{handle} </h1>
          <p className="text-sm text-anon-gray">{tips.length ? `₦${tips.reduce((s,x)=>s+x.amount,0).toLocaleString("en-NG")} raised · ${tips.length} tip${tips.length!==1?"s":""}` : "No tips yet — be the first!"}</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-6"><ShimmerCard count={3} /></div>
      ) : (
        <ul className="mt-6 space-y-3">
          {tips.map((t) => (
            <li key={t.id} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm flex gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-anon-gray/20 flex items-center justify-center text-xs font-bold text-anon-gray">
                {t.is_anonymous ? "?" : t.tipper.slice(1, 3).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal">₦{t.amount.toLocaleString("en-NG")} · {t.is_anonymous ? <span className="text-anon-gray">anon</span> : t.tipper} · {new Date(t.created_at).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}</p>
                <p className="text-sm text-charcoal/80">{t.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="sticky bottom-6 mt-6">
        <a
          href={`/@${handle}/video/${handle === "ayo_jazz" ? "7234567890123456789" : "demo123"}`}
          className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-brand-blue text-white font-bold shadow-md hover:bg-[#0046CC] focus-visible:ring-2 focus-visible:ring-brand-blue/30"
        >
          ₦ Tip this creator
        </a>
      </div>
      {retries > 0 && loading && <p className="mt-2 text-center text-xs text-anon-gray">Retrying… {retries}/3</p>}
    </div>
  );
}
