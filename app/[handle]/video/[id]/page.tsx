"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import TipChip from "@/components/TipChip";
import AnonToggle from "@/components/AnonToggle";
import CopyButton from "@/components/CopyButton";
export const dynamic = "force-dynamic";
const AMOUNTS = [500, 1000, 2000, 5000];

const CUR_SYM: Record<string, string> = { USD: "$", GBP: "£", EUR: "€" };
const EUR_COUNTRIES = new Set([
  "DE", "FR", "IE", "NL", "ES", "IT", "PT", "BE", "AT", "FI", "GR", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR",
]);

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
  // Diaspora mode: foreign-currency display, charged in NGN via Paystack
  const [showFx, setShowFx] = useState(false);
  const [fxCur, setFxCur] = useState("USD");
  const [fxRates, setFxRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [geoR, fxR] = await Promise.all([
          fetch("/api/geo").then((r) => r.json()).catch(() => ({})),
          fetch("/api/fx").then((r) => r.json()).catch(() => ({})),
        ]);
        if (cancelled) return;
        if (fxR?.rates) setFxRates(fxR.rates);
        const c = (geoR?.country || "").toUpperCase();
        if (c && c !== "NG") {
          setShowFx(true);
          setFxCur(c === "GB" ? "GBP" : EUR_COUNTRIES.has(c) ? "EUR" : "USD");
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const amount = customMode && custom ? parseInt(custom, 10) || 0 : selected;
  const amountKobo = amount * 100;
  const fxRate = fxRates?.[fxCur] || null;
  // Fan-covers-fee: chips set the TIP (creator nets 100%); fan pays ceil(tip / 0.9), whole naira.
  const chargeN = amount > 0 ? Math.ceil(amount / 0.9) : 0;
  const feeN = chargeN - amount;
  const fxEquiv = fxRate && chargeN > 0 ? chargeN / fxRate : null;

  async function pay() {
    if (!amount || amount < 100) { setError("Minimum tip is ₦100"); return; }
    if (amount > 50000) { setError("Maximum tip is ₦50,000"); return; }
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
        <h1 className="mt-4 text-xl font-extrabold tracking-tight text-charcoal">Tip sent</h1>
        <p className="mt-1 text-sm text-anon-gray font-mono tnum">₦{amount.toLocaleString("en-NG")} to @{handle} {anon ? "· anonymous" : ""}</p>
        <a href={`/@${handle}`} className="mt-6 inline-flex min-h-[48px] items-center rounded-md border border-slate-line px-6 text-sm font-semibold">Back to profile</a>
      </div>
    );
  }

  return (
    <div className="pt-4 w-full min-w-0">
      <div className="overflow-hidden rounded-lg bg-charcoal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Image src={`https://picsum.photos/seed/video-${params.id}/640/800`} alt="video thumb" width={640} height={800} className="aspect-[9/14] sm:aspect-[9/14] max-h-[60vh] sm:max-h-[480px] w-full object-cover object-center" sizes="(max-width: 640px) 100vw, 640px" priority />
        <div className="p-3 sm:p-4">
          <p className="text-sm font-semibold tracking-tight text-white">@{handle}</p>
          <p className="text-xs text-white/60 font-mono tnum">1.2M views · 42K likes {isDemo ? "· demo video" : ""}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-charcoal">Tip amount</h2>
        <CopyButton text={`@${handle}`} label="Copy handle" />
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-2 snap-x">
        {AMOUNTS.map((a) => (
          <TipChip key={a} amount={a} selected={!customMode && selected === a} onPress={() => { setSelected(a); setCustomMode(false); }} />
        ))}
        <TipChip amount={customMode && custom ? parseInt(custom,10) : "Custom"} selected={customMode} onPress={() => setCustomMode(true)} />
      </div>

      {customMode && (
        <>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={custom}
            onChange={(e) => { const v=e.target.value.replace(/\D/g,"").slice(0,6); if(parseInt(v||"0")>50000) setError("Maximum tip is ₦50,000"); else if(error==="Maximum tip is ₦50,000") setError(null); setCustom(v); }}
            aria-label="Custom amount"
            placeholder="₦750"
            className="mt-2 w-full rounded-lg border border-slate-line px-4 py-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px] font-mono tnum"
          />
          <p className="text-xs text-anon-gray mt-1 font-mono tnum">Min ₦100 · Max ₦50,000</p>
        </>
      )}

      <label className="mt-4 block">
        <span className="text-sm font-semibold tracking-tight text-charcoal">Email <span className="font-normal text-anon-gray">for Paystack receipt</span></span>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) setError(null); }}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-lg border border-slate-line px-4 py-3 text-sm placeholder:text-anon-gray focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-semibold tracking-tight text-charcoal">Message <span className="font-normal text-anon-gray font-mono">({message.length}/140)</span></span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 140))}
          placeholder="Say thanks"
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-line px-4 py-3 text-sm placeholder:text-anon-gray focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
        />
      </label>

      <div className="mt-4 rounded-lg border border-slate-line p-4">
        <AnonToggle checked={anon} onChange={setAnon} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-anon-gray">
          {showFx && fxEquiv !== null
            ? <>≈ {CUR_SYM[fxCur]}{fxEquiv.toLocaleString("en-US", { maximumFractionDigits: 2 })} total · @{handle} gets ₦{amount.toLocaleString("en-NG")}</>
            : <>₦{amount.toLocaleString("en-NG")} tip + ₦{feeN.toLocaleString("en-NG")} fee = ₦{chargeN.toLocaleString("en-NG")} total · @{handle} gets ₦{amount.toLocaleString("en-NG")}</>}
        </p>
        <button
          onClick={() => setShowFx((v) => !v)}
          aria-label="Toggle foreign currency display"
          className="shrink-0 ml-2 rounded-md border border-slate-line px-2 py-1 text-xs font-mono font-semibold text-anon-gray min-h-[32px]"
        >
          {showFx ? "₦" : "$/£"}
        </button>
      </div>
      {showFx && (
        <div className="mt-2 flex gap-2">
          {["USD", "GBP", "EUR"].map((c) => (
            <button
              key={c}
              onClick={() => setFxCur(c)}
              className={`rounded-md border px-3 py-1 text-xs font-mono font-semibold min-h-[32px] ${fxCur === c ? "bg-brand-ink text-white border-brand-ink" : "bg-white text-anon-gray border-slate-line"}`}
            >
              {CUR_SYM[c]} {c}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={pay}
        disabled={paying || !amount || amount < 100 || amount > 50000}
        className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-brand-blue text-white font-semibold text-sm hover:bg-[#0046CC] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-blue/30"
      >
        {paying ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
        {paying ? "Opening Paystack" : `Pay ₦${(chargeN || 0).toLocaleString("en-NG")}`}
      </button>
      <a href={`/@${handle}`} className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-md border border-slate-line text-sm font-semibold text-charcoal">Cancel</a>
      <p className="mt-3 text-center text-xs text-anon-gray">Secured by Paystack · anon hides your name</p>
      {isDemo && <p className="mt-2 text-center text-xs text-amber-600">Demo video — tipping will be a profile tip (no video attached)</p>}
    </div>
  );
}
