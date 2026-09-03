export const dynamic = "force-dynamic";

export default function RefundsPage() {
  return (
    <div className="pt-6 max-w-[640px] mx-auto px-4 w-full min-w-0">
      <h1 className="text-xl font-extrabold tracking-tight text-charcoal">Refunds</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-charcoal/80">
        <p>Tips are instant split payouts to creators and cannot be auto-reversed from TipJar.</p>
        <p>Duplicate or failed-but-charged tips: contact us with your Paystack reference (shown on the success page) within 7 days and we resolve manually via Paystack.</p>
        <p>Test mode tips move no real money and need no refunds.</p>
      </div>
      <a href="/" className="mt-6 inline-flex min-h-[44px] items-center rounded-md border border-slate-line px-6 text-sm font-semibold">Back to TipJar</a>
    </div>
  );
}
