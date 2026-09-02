"use client";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-16 px-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
      <p className="text-6xl font-bold text-brand-blue">404</p>
      <p className="mt-2 text-lg text-charcoal">Page not found</p>
      <p className="mt-1 text-anon-gray">The creator or page you're looking for doesn't exist.</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-[48px] items-center justify-center px-6 py-2 rounded-full bg-brand-blue text-white font-semibold hover:bg-[#0046CC] focus-visible:ring-2 focus-visible:ring-brand-blue/30"
      >
        Go home
      </Link>
    </div>
  );
}