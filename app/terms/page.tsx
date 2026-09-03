export const dynamic = "force-dynamic";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-6 max-w-[640px] mx-auto px-4 w-full min-w-0">
      <h1 className="text-xl font-extrabold tracking-tight text-charcoal">{title}</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-charcoal/80">{children}</div>
      <a href="/" className="mt-6 inline-flex min-h-[44px] items-center rounded-md border border-slate-line px-6 text-sm font-semibold">Back to TipJar</a>
    </div>
  );
}

export default function TermsPage() {
  return (
    <Shell title="Terms">
      <p>TipJar lets fans tip Nigerian TikTok creators in Naira via Paystack. Tips are voluntary support, not payment for goods.</p>
      <p>Creators receive 90% of each tip after Paystack fees via Paystack Split to their bank (Opay/PalmPay supported). TipJar retains 10%.</p>
      <p>Anonymous tips hide your name and email from the public feed. Paystack still requires an email for receipts.</p>
      <p>Test mode: payments on this deployment use Paystack test keys and move no real money.</p>
    </Shell>
  );
}
