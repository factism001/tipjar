export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div className="pt-6 max-w-[640px] mx-auto px-4 w-full min-w-0">
      <h1 className="text-xl font-extrabold tracking-tight text-charcoal">Pricing</h1>
      <p className="mt-1 text-sm text-anon-gray">Simple, transparent. No hidden cuts.</p>

      <div className="mt-5 rounded-lg border border-slate-line bg-white p-4 sm:p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-anon-gray">Fan tips creator</span>
          <span className="font-mono font-bold text-charcoal tnum">₦1,000</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-anon-gray">Service fee (10%, fan covers)</span>
          <span className="font-mono font-bold text-charcoal tnum">+ ₦112</span>
        </div>
        <div className="border-t border-slate-line pt-3 flex justify-between text-sm">
          <span className="font-semibold text-charcoal">Fan pays</span>
          <span className="font-mono font-bold text-charcoal tnum">₦1,112</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-anon-gray">Creator nets (100% of tip)</span>
          <span className="font-mono font-bold text-naija-green tnum">₦1,000</span>
        </div>
        <p className="text-xs text-anon-gray">Paystack processing (~1.5% + ₦100 capped) comes out of the 10% service fee, not out of the creator&apos;s tip.</p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-line bg-[#F8FAFC] p-4">
        <p className="text-sm font-semibold text-charcoal">The rule</p>
        <p className="mt-1 text-sm text-anon-gray">Fan pays tip + 10% (rounded up to whole naira: charge = ceil(tip / 0.9)). Creator nets 100% of the tip. Minimum tip ₦100, maximum ₦50,000.</p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <a href="/onboard" className="flex min-h-[48px] w-full items-center justify-center rounded-md bg-brand-blue text-white font-semibold text-sm">Claim your handle</a>
        <a href="/" className="flex min-h-[44px] w-full items-center justify-center rounded-md border border-slate-line text-sm font-semibold">Explore creators</a>
      </div>
    </div>
  );
}
