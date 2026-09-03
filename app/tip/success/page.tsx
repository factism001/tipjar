export const dynamic = "force-dynamic";

export default function TipSuccessPage({ searchParams }: { searchParams: { ref?: string; reference?: string; trxref?: string } }) {
  const ref = searchParams?.ref || searchParams?.reference || searchParams?.trxref || "";
  return (
    <div className="pt-6 sm:pt-8 text-center max-w-[640px] mx-auto px-4 w-full min-w-0">
      <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-naija-green text-white text-xl sm:text-2xl">✓</div>
      <h1 className="mt-4 text-lg sm:text-xl font-extrabold tracking-tight text-charcoal">Payment successful</h1>
      <p className="mt-2 text-sm text-anon-gray px-2">Confirming. The creator sees it in about 30 seconds.</p>
      {ref && (
        <div className="mt-4 rounded-lg border border-slate-line bg-[#F8FAFC] p-3 sm:p-4">
          <p className="text-xs text-anon-gray">Reference</p>
          <p className="text-sm font-mono font-semibold text-charcoal break-all tnum">{ref}</p>
        </div>
      )}
      <p className="mt-2 text-xs text-anon-gray px-2">If Paystack shows success, the dashboard updates in about 30 seconds.</p>
      <div className="mt-6 flex flex-col gap-3">
        <a href="/" className="flex min-h-[48px] w-full items-center justify-center rounded-md bg-brand-blue text-white font-semibold text-sm sm:text-base">Back to TipJar</a>
        <a href={`/`} className="flex min-h-[44px] w-full items-center justify-center rounded-md border border-slate-line text-sm font-semibold">Explore creators</a>
      </div>
    </div>
  );
}
