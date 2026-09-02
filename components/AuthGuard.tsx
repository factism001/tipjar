"use client";
import { useEffect, useState } from "react";
type Props = { children: React.ReactNode; onVerified?: (token: string) => void };
export default function AuthGuard({ children, onVerified }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("tipjar_otp_token") : null;
    if (t) setToken(t);
  }, []);
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  function normalizePhone(v: string) {
    const d = v.replace(/\D/g, "");
    if (d.startsWith("0")) return "+234" + d.slice(1);
    if (d.startsWith("234")) return "+" + d;
    if (v.startsWith("+")) return v;
    return d ? `+234${d}` : v;
  }

  async function sendOtp() {
    setError("");
    if (!phone.trim()) { setError("Enter phone or email"); return; }
    setSending(true);
    try {
      // stubbed: in prod POST /api/auth/otp
      await new Promise((r) => setTimeout(r, 700));
      setStep("code");
      setResendIn(30);
    } catch { setError("Failed to send code. Try again."); }
    finally { setSending(false); }
  }
  async function verify() {
    setError("");
    if (code.length < 4) { setError("Enter 6-digit code"); return; }
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const tok = `tipjar_${Date.now()}`;
      localStorage.setItem("tipjar_otp_token", tok);
      // 300s expiry marker
      localStorage.setItem("tipjar_otp_exp", String(Date.now() + 300_000));
      setToken(tok);
      setSuccess(true);
      onVerified?.(tok);
      setTimeout(() => setSuccess(false), 1200);
    } catch { setError("Invalid code"); }
    finally { setSending(false); }
  }

  if (token) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-lg" role="dialog" aria-modal="true" aria-label="Verify your number">
        <h2 className="text-xl font-bold text-charcoal">Verify your number ✨</h2>
        <p className="mt-1 text-sm text-anon-gray">We go send code to your phone — e quick, 30 seconds.</p>

        {step === "phone" ? (
          <div className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-charcoal">Phone or email
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 802 XXX XXXX or email"
                inputMode="tel"
                className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
              />
            </label>
            {error && <p className="text-sm text-warn-amber border border-warn-amber/30 rounded-lg px-3 py-2 bg-warn-amber/5">{error}</p>}
            <button
              onClick={sendOtp}
              disabled={sending}
              className="w-full min-h-[48px] rounded-full bg-brand-blue text-white font-bold text-sm hover:bg-[#0046CC] disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-brand-blue/30"
            >
              {sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
              {sending ? "Sending…" : "Send OTP"}
            </button>
            <p className="text-center text-xs text-anon-gray">Code expires in 300s · 10 req/min limit</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-charcoal">Code sent to <span className="font-semibold">{normalizePhone(phone)}</span></p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-center text-lg tracking-[0.4em] focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
            />
            {error && <p className="text-sm text-warn-amber border border-warn-amber/30 rounded-lg px-3 py-2 bg-warn-amber/5">{error}</p>}
            {success && <p className="text-sm text-naija-green flex items-center gap-2">✓ Verified!</p>}
            <button
              onClick={verify}
              disabled={sending}
              className="w-full min-h-[48px] rounded-full bg-brand-blue text-white font-bold text-sm hover:bg-[#0046CC] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
              Verify
            </button>
            <button
              onClick={sendOtp}
              disabled={resendIn > 0 || sending}
              className="w-full text-sm font-semibold text-brand-blue disabled:text-anon-gray min-h-[44px]"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
            <button onClick={() => setStep("phone")} className="w-full text-xs text-anon-gray">Change number</button>
          </div>
        )}
      </div>
    </div>
  );
}
