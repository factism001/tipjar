"use client";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { getAccessToken } from "@/lib/supabase-client";
import { BANKS } from "@/lib/banks";

export const dynamic = "force-dynamic";

async function authed(path: string, body: unknown) {
  const token = await getAccessToken();
  if (!token) throw new Error("Session expired — reload and sign in again");
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Something went wrong");
  return j;
}

export default function OnboardPage({ searchParams }: { searchParams?: { handle?: string } }) {
  const [handle, setHandle] = useState((searchParams?.handle || "").replace(/^@/, "").toLowerCase());
  const [bankCode, setBankCode] = useState("999992");
  const [bankName, setBankName] = useState("OPay Digital Services Limited (OPay)");
  const [acct, setAcct] = useState("");
  const [acctName, setAcctName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ handle: string; tip_url: string; account_name: string } | null>(null);

  const bankOk = /^\d{10}$/.test(acct);
  const handleOk = /^[a-z0-9._]{2,30}$/i.test(handle.replace(/^@/, ""));

  function pickBank(code: string) {
    setBankCode(code);
    setAcctName(null);
    setBankName(BANKS.find((b) => b.code === code)?.name || "");
  }

  async function verifyAccount() {
    setError("");
    setAcctName(null);
    if (!bankOk) { setError("Account number must be 10 digits"); return; }
    setVerifying(true);
    try {
      const j = await authed("/api/onboard/resolve", { account_number: acct, bank_code: bankCode });
      setAcctName(j.account_name);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setVerifying(false);
    }
  }

  async function claim() {
    setError("");
    if (!handleOk) { setError("Handle: 2-30 chars, letters, numbers, . or _"); return; }
    if (!acctName) { setError("Verify your bank account first"); return; }
    setClaiming(true);
    try {
      const j = await authed("/api/onboard/claim", {
        handle: handle.replace(/^@/, "").toLowerCase(),
        bank_code: bankCode,
        account_number: acct,
      });
      setDone({ handle: j.handle, tip_url: j.tip_url, account_name: j.account_name || acctName });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <AuthGuard>
      <div className="pt-6 max-w-[480px] mx-auto px-4 w-full min-w-0">
        {!done ? (
          <>
            <h1 className="text-xl font-extrabold tracking-tight text-charcoal">Claim your handle</h1>
            <p className="mt-1 text-sm text-anon-gray">Tips go straight to your bank via Paystack Split (90% you, 10% TipJar).</p>

            <label className="mt-5 block">
              <span className="text-sm font-semibold tracking-tight text-charcoal">TikTok handle</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/\s/g, ""))}
                placeholder="ayo_jazz"
                className="mt-1 w-full rounded-lg border border-slate-line px-4 py-3 text-sm font-mono focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-semibold tracking-tight text-charcoal">Bank</span>
              <input
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  const hit = BANKS.find((b) => b.name.toLowerCase() === e.target.value.toLowerCase());
                  if (hit) pickBank(hit.code);
                }}
                list="tipjar-banks"
                placeholder="Start typing your bank"
                className="mt-1 w-full rounded-lg border border-slate-line px-4 py-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
              />
              <datalist id="tipjar-banks">
                {BANKS.map((b) => (
                  <option key={b.code} value={b.name} />
                ))}
              </datalist>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-semibold tracking-tight text-charcoal">Account number</span>
              <input
                value={acct}
                onChange={(e) => { setAcct(e.target.value.replace(/\D/g, "").slice(0, 10)); setAcctName(null); }}
                placeholder="0123456789"
                inputMode="numeric"
                maxLength={10}
                className="mt-1 w-full rounded-lg border border-slate-line px-4 py-3 text-sm font-mono tnum focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
              />
            </label>

            {acctName && (
              <p className="mt-2 text-sm text-naija-green">✓ {acctName}</p>
            )}
            {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

            <div className="mt-5 flex flex-col gap-3">
              <button
                onClick={verifyAccount}
                disabled={verifying || !bankOk}
                className="flex min-h-[48px] w-full items-center justify-center rounded-md border border-slate-line text-sm font-semibold text-charcoal disabled:opacity-60"
              >
                {verifying ? "Verifying" : acctName ? "Re-verify account" : "Verify account"}
              </button>
              <button
                onClick={claim}
                disabled={claiming || !handleOk || !acctName}
                className="flex min-h-[48px] w-full items-center justify-center rounded-md bg-brand-blue text-white font-semibold text-sm hover:bg-[#0046CC] disabled:opacity-60"
              >
                {claiming ? "Claiming" : "Claim handle"}
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-anon-gray">Beta: handle ownership is confirmed manually.</p>
          </>
        ) : (
          <div className="pt-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-naija-green text-white text-xl">✓</div>
            <h1 className="mt-4 text-xl font-extrabold tracking-tight text-charcoal">@{done.handle} is yours</h1>
            <p className="mt-1 text-sm text-anon-gray">Payouts to {done.account_name}</p>
            <div className="mt-4 rounded-lg border border-slate-line bg-[#F8FAFC] p-3">
              <p className="text-xs text-anon-gray">Your tip link</p>
              <p className="text-sm font-mono font-semibold text-charcoal break-all tnum">tipjar-gray.vercel.app{done.tip_url}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <a href={done.tip_url} className="flex min-h-[48px] w-full items-center justify-center rounded-md bg-brand-blue text-white font-semibold text-sm">View my page</a>
              <a href="/dashboard" className="flex min-h-[44px] w-full items-center justify-center rounded-md border border-slate-line text-sm font-semibold">Open dashboard</a>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
