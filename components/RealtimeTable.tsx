"use client";
import { useEffect, useState } from "react";
import CopyButton from "./CopyButton";

type Tip = { id: string; amount: number; tipper: string; is_anonymous: boolean; created_at: string; message?: string };

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function RealtimeTable({ initialTips = [] as Tip[], wsUrl }: { initialTips?: Tip[]; wsUrl?: string }) {
  const [tips, setTips] = useState<Tip[]>(initialTips);
  const [live, setLive] = useState(false);
  const [visible, setVisible] = useState(10);

  useEffect(() => {
    if (!wsUrl) return;
    let ws: WebSocket | null = null;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout>;
    function connect() {
      try {
        ws = new WebSocket(wsUrl as string);
        ws.onopen = () => { setLive(true); retries = 0; };
        ws.onmessage = (e) => {
          try { const t = JSON.parse(e.data) as Tip; setTips((p) => [t, ...p]); } catch {}
        };
        ws.onclose = () => {
          setLive(false);
          const delay = Math.min(1000 * 2 ** retries, 15000);
          retries += 1;
          timer = setTimeout(connect, delay);
        };
      } catch { setLive(false); }
    }
    connect();
    return () => { if (ws) ws.close(); clearTimeout(timer); };
  }, [wsUrl]);

  // demo: simulate live if no wsUrl in preview
  useEffect(() => {
    if (wsUrl) return;
    setLive(true);
  }, [wsUrl]);

  const shown = tips.slice(0, visible);

  if (tips.length === 0) {
    return (
      <div className="rounded-lg border border-slate-line p-8 text-center">
        <p className="text-sm text-anon-gray">No tips yet. Share your handle to get started.</p>
        <span className={`mt-3 inline-flex h-2 w-2 rounded-full ${live ? "bg-naija-green animate-pulse" : "bg-anon-gray"}`} aria-label={live ? "live" : "offline"} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-line bg-white shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-line">
      <h3 className="text-sm font-semibold tracking-tight text-charcoal">Tips</h3>
        <span className="flex items-center gap-2 text-xs text-anon-gray">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-naija-green animate-pulse" : "bg-anon-gray"}`} /> {live ? "Live" : "Offline"}
        </span>
      </div>
      <ul className="divide-y divide-slate-line max-h-[520px] overflow-auto">
        {shown.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC]">
            <div className="h-9 w-9 shrink-0 rounded-full bg-anon-gray/20 flex items-center justify-center text-xs font-bold text-anon-gray">
              {t.is_anonymous ? "?" : t.tipper.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight text-charcoal truncate tnum">
                ₦{t.amount.toLocaleString("en-NG")} <span className="font-normal text-anon-gray">· {t.is_anonymous ? "anon" : t.tipper} · {timeAgo(t.created_at)}</span>
              </p>
              {t.message && <p className="text-xs text-charcoal/70 truncate">{t.message}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <CopyButton text={`${t.is_anonymous ? "anonymous" : t.tipper} tipped ₦${t.amount.toLocaleString("en-NG")}`} label="Copy" anon={t.is_anonymous} />
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Thanks ${t.is_anonymous ? "anonymous" : t.tipper} for the ₦${t.amount.toLocaleString("en-NG")} tip! https://tipjar.ng/@handle`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center rounded-md bg-brand-ink px-4 text-xs font-semibold text-white hover:bg-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
              >
                Thank
              </a>
            </div>
          </li>
        ))}
      </ul>
      {visible < tips.length && (
        <button onClick={() => setVisible((v) => v + 10)} className="w-full py-3 text-sm font-semibold text-brand-blue hover:bg-brand-blue/[0.04] min-h-[44px]">
          Load more
        </button>
      )}
    </div>
  );
}
