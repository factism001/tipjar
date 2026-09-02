"use client";
import { useState } from "react";
import TipChip from "@/components/TipChip";
import AnonToggle from "@/components/AnonToggle";
import CopyButton from "@/components/CopyButton";
export const dynamic = "force-dynamic";
const AMOUNTS = [500, 1000, 2000, 5000];

export default function VideoTipPage({ params }: { params: { handle: string; id: string } }) {
  const handle = decodeURIComponent(params?.handle ?? "demo").replace(/^@/, "");
  const videoId = decodeURIComponent(params?.id ?? "");
  const isDemo = videoId === "demo123" || !/^\d{10,20}$/.test(videoId);
  const [selected, setSelected] = useState<number>(500);
  const [custom, setCustom] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [message, setMessage] = useState("");
  const [anon, setAnon] = useState(false);
  const [email, setEmail] = useState("");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = customMode && custom ? parseInt(custom, 10) || 0 : selected;
  const amountKobo = amount * 100;

  async function pay() {
    if (!amount || amount < 100) { setError("Minimum tip is ₦100"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email for Paystack receipt"); return; }
    setError(null);
    setPaying(true);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_handle: handle,
          video_id: isDemo ? null : videoId,
          amount: amountKobo,
          tipper_email: email,
          tipper_name: anon ? null : email.split("@")[0],
          message: message || null,
          is_anonymous: anon,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Payment failed");
      }
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
      throw new Error("No Paystack URL returned");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 300));
    } finally {
      setPaying(false);
    }
  }

  if (paid) {
    return (
      <div className="pt-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-naija-green text-white text-2xl">✓</div>
        <h1 className="mt-4 text-xl font-bold text-charcoal">Tip sent! 🎉</h1>
        <p className="mt-1 text-sm text-anon-gray">₦{amount.toLocaleString("en-NG")} to @{handle} {anon ? "anonymously" : ""}</p>
        <a href={`/@${handle}`} className="mt-6 inline-flex min-h-[48px] items-center rounded-full border border-[#E5E7EB] px-6 text-sm font-semibold">Back to profile</a>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="overflow-hidden rounded-xl bg-charcoal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://picsum.photos/seed/video-${params.id}/360/480`} alt="video thumb" width={360} height={480} className="h-[320px] w-full object-cover" />
        <div className="p-3">
          <p className="text-sm font-semibold text-white">@{handle}: money rain 🎵</p>
          <p className="text-xs text-white/60">1.2M views · 42K likes {isDemo ? "· demo video" : ""}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-charcoal">Tip Amount</h2>
        <CopyButton text={`@${handle}`} label="Copy handle" />
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-2 snap-x">
        {AMOUNTS.map((a) => (
          <TipChip key={a} amount={a} selected={!customMode && selected === a} onPress={() => { setSelected(a); setCustomMode(false); }} />
        ))}
        <TipChip amount={customMode ? (custom ? `₦${custom}` : "Custom") : "Custom"} selected={customMode} onPress={() => setCustomMode(true)} label={customMode && custom ? `₦${custom}` : "Custom ₦"} />
      </div>

      {customMode && (
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter amount e.g. 750"
          className="mt-2 w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
        />
      )}

      <label className="mt-4 block">
        <span className="text-sm font-bold text-charcoal">Your email <span className="font-normal text-anon-gray">(for Paystack receipt)</span></span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm placeholder:text-anon-gray focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-bold text-charcoal">Message <span className="font-normal text-anon-gray">({message.length}/140)</span></span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 140))}
          placeholder="Shoutout: thanks for the 🔥"
          rows={3}
          className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm placeholder:text-anon-gray focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
        />
      </label>

      <div className="mt-4 rounded-xl border border-[#E5E7EB] p-4">
        <AnonToggle checked={anon} onChange={setAnon} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

      <button
        onClick={pay}
        disabled={paying || !amount || amount < 100}
        className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-brand-blue text-white font-bold text-sm hover:bg-[#0046CC] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-blue/30"
      >
        {paying ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
        {paying ? "Opening Paystack…" : `Pay ₦${(amount || 0).toLocaleString("en-NG")} now`}
      </button>
      <a href={`/@${handle}`} className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-full border border-[#E5E7EB] text-sm font-semibold text-charcoal">Cancel</a>
      <p className="mt-3 text-center text-xs text-anon-gray">Secured by Paystack · 10 req/min/IP · anon toggle hides name</p>
      {isDemo && <p className="mt-2 text-center text-xs text-amber-600">Demo video — tipping will be a profile tip (no video attached)</p>}
    </div>
  );
}
