"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser, getAccessToken } from "@/lib/supabase-client";

type Props = { children: React.ReactNode; onVerified?: (token: string) => void };

export default function AuthGuard({ children, onVerified }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabaseBrowser().auth.getSession().then(({ data }) => {
      const t = data.session?.access_token || null;
      setToken(t);
      if (t) onVerified?.(t);
      setChecking(false);
    });
    const { data: sub } = supabaseBrowser().auth.onAuthStateChange((_e, session) => {
      const t = session?.access_token || null;
      setToken(t);
      if (t) onVerified?.(t);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  async function sendOtp() {
    setError("");
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setError("Enter a valid email"); return; }
    setSending(true);
    try {
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        email: clean,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setEmail(clean);
      setStep("code");
      setResendIn(60);
    } catch {
      setError("Failed to send code. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    setError("");
    if (code.replace(/\D/g, "").length < 6) { setError("Enter the 6-digit code"); return; }
    setSending(true);
    try {
      const { data, error } = await supabaseBrowser().auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.replace(/\D/g, "").slice(0, 6),
        type: "email",
      });
      if (error) throw error;
      const t = data.session?.access_token || (await getAccessToken());
      if (!t) throw new Error("no session");
      setToken(t);
      onVerified?.(t);
    } catch {
      setError("Invalid or expired code");
    } finally {
      setSending(false);
    }
  }

  if (checking) {
    return <div className="pt-16 text-center text-sm text-anon-gray">Checking session</div>;
  }
  if (token) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[360px] rounded-lg bg-white p-6 shadow-lg" role="dialog" aria-modal="true" aria-label="Verify your email">
        <h2 className="text-xl font-extrabold tracking-tight text-charcoal">Verify your email</h2>
        <p className="mt-1 text-sm text-anon-gray">Enter the 6-digit code. Expires in 60 minutes.</p>

        {step === "email" ? (
          <div className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-charcoal">Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                inputMode="email"
                className="mt-1 w-full rounded-lg border border-slate-line px-4 py-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
              />
            </label>
            {error && <p className="text-sm text-red-600 border border-red-200 rounded-lg px-3 py-2 bg-red-50">{error}</p>}
            <button
              onClick={sendOtp}
              disabled={sending}
              className="w-full min-h-[48px] rounded-md bg-brand-blue text-white font-semibold text-sm hover:bg-[#0046CC] disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-brand-blue/30"
            >
              {sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
              {sending ? "Sending" : "Send code"}
            </button>
            <p className="text-center text-xs text-anon-gray font-mono">Code expires in 60 min</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-charcoal">Code sent to <span className="font-semibold">{email}</span></p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-lg border border-slate-line px-4 py-3 text-center text-lg tracking-[0.4em] font-mono focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
            />
            {error && <p className="text-sm text-red-600 border border-red-200 rounded-lg px-3 py-2 bg-red-50">{error}</p>}
            <button
              onClick={verify}
              disabled={sending}
              className="w-full min-h-[48px] rounded-md bg-brand-blue text-white font-semibold text-sm hover:bg-[#0046CC] disabled:opacity-60 flex items-center justify-center gap-2"
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
            <button onClick={() => setStep("email")} className="w-full text-xs text-anon-gray">Change email</button>
          </div>
        )}
      </div>
    </div>
  );
}
