import type { Metadata, Viewport } from "next";
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  title: "TipJar — Tip Naija creators",
  description: "Support Naija creators with instant tips via Paystack.",
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0057FF",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased overflow-x-hidden">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-[#F3F4F6]">
          <div className="mx-auto max-w-[640px] flex items-center justify-between px-4 py-3 gap-2">
            <a href="/" className="text-lg sm:text-xl font-bold text-charcoal shrink-0 min-h-[44px] flex items-center">TipJar<span className="text-brand-blue">.</span></a>
            <a href="/dashboard" className="text-sm font-semibold text-brand-blue hover:underline min-h-[44px] flex items-center px-3 -mr-3">Dashboard</a>
          </div>
        </header>
        <main className="mx-auto max-w-[640px] px-4 pb-24 w-full min-w-0">{children}</main>
        <footer className="mx-auto max-w-[640px] px-4 py-8 text-center text-xs sm:text-sm text-anon-gray">Made with 💙 in Lagos · Paystack secured</footer>
      </body>
    </html>
  );
}
