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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))` }} />
      </head>
      <body className="min-h-screen bg-white antialiased overflow-x-hidden">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-slate-line">
          <div className="mx-auto max-w-[640px] flex items-center justify-between px-4 py-3 gap-2">
            <a href="/" className="text-lg sm:text-xl font-extrabold tracking-tight text-charcoal shrink-0 min-h-[44px] flex items-center">TipJar<span className="text-brand-blue">.</span></a>
            <a href="/dashboard" className="text-sm font-semibold text-brand-blue hover:underline min-h-[44px] flex items-center px-3 -mr-3">Dashboard</a>
          </div>
        </header>
        <main className="mx-auto max-w-[640px] px-4 pb-24 w-full min-w-0">{children}</main>
        <footer className="mx-auto max-w-[640px] px-4 py-8 text-center text-xs sm:text-sm text-anon-gray">TipJar · Lagos · <span className="font-mono">Paystack secured</span></footer>
      </body>
    </html>
  );
}
