"use client";
import { useState } from "react";
import { getAccessToken } from "@/lib/supabase-client";

type T = { id: string; amount: number; tipper: string; message?: string; thank_you_message?: string | null };

export default function ThankYouBox({ tips, onPosted }: { tips: T[]; onPosted: (id: string, msg: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const unthanked = tips.filter((t) => !t.thank_you_message).slice(0, 5);
  if (!unthanked.length) return null;

  async function post(tipId: string) {
    setErr("");
    if (!msg.trim()) { setErr("Write a thank-you first"); return; }
    setSending(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/thanks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tip_id: tipId, message: msg.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to post");
      onPosted(tipId, msg.trim());
      setMsg("");
      setOpenId(null);
    } catch (e: any) {
      setErr(e.message || "Failed to post");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-slate-line bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold tracking-tight text-charcoal">Say thank you</h2>
      <p className="mt-1 text-sm text-anon-gray">Public thank-yous show on your page and bring tippers back.</p>
      <div className="mt-3 space-y-3">
        {unthanked.map((t) => (
          <div key={t.id} className="rounded-md bg-[#F8FAFC] border border-slate-line p-3">
            <p className="text-sm font-semibold text-charcoal tnum">₦{t.amount.toLocaleString("en-NG")} · {t.tipper}</p>
            {t.message ? <p className="text-sm text-anon-gray truncate">“{t.message}”</p> : null}
            {openId === t.id ? (
              <div className="mt-2">
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value.slice(0, 280))}
                  placeholder="Thank you so much! 🙏"
                  className="w-full rounded-md border border-slate-line px-3 py-2 text-sm min-h-[44px]"
                />
                {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => post(t.id)} disabled={sending} className="flex min-h-[44px] flex-1 items-center justify-center rounded-md bg-brand-blue px-4 text-sm font-semibold text-white disabled:opacity-50">
                    {sending ? "Posting…" : "Post thank-you"}
                  </button>
                  <button onClick={() => { setOpenId(null); setMsg(""); }} className="min-h-[44px] px-4 text-sm font-semibold text-anon-gray">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setOpenId(t.id)} className="mt-2 min-h-[44px] px-3 text-sm font-semibold text-brand-blue">Thank them</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
