export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <div className="pt-6 max-w-[640px] mx-auto px-4 w-full min-w-0">
      <h1 className="text-xl font-extrabold tracking-tight text-charcoal">Privacy</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-charcoal/80">
        <p>We store: tip amount, reference, email (for Paystack receipts), optional name/message, and whether the tip is anonymous.</p>
        <p>Public feeds never show emails. Anonymous tips show as “anon”.</p>
        <p>We never store card details — Paystack processes all payments. We never log TikTok tokens or Paystack secrets.</p>
        <p>Contact: support via your creator dashboard. Data deletion on request before launch.</p>
      </div>
      <a href="/" className="mt-6 inline-flex min-h-[44px] items-center rounded-md border border-slate-line px-6 text-sm font-semibold">Back to TipJar</a>
    </div>
  );
}
