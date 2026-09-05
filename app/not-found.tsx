"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Body() {
  const sp = useSearchParams();
  const handle = (sp.get("handle") || "").replace(/^@/, "").toLowerCase();
  return (
    <div className="pt-16 px-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
      <p className="text-6xl font-bold text-brand-blue">404</p>
      <p className="mt-2 text-lg text-charcoal">Page not found</p>
      <p className="mt-1 text-anon-gray">The creator or page you&apos;re looking for doesn&apos;t exist.</p>
      {handle ? (
        <Link
          href={`/onboard?handle=${encodeURIComponent(handle)}`}
          className="mt-6 inline-flex min-h-[48px] items-center justify-center px-6 py-2 rounded-md bg-brand-blue text-white font-semibold"
        >
          Claim @{handle}
        </Link>
      ) : null}
      <Link
        href="/"
        className="mt-3 inline-flex min-h-[44px] items-center justify-center px-6 py-2 rounded-md border border-slate-line text-sm font-semibold"
      >
        Go home
      </Link>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}
