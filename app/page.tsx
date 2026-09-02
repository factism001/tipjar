"use client";
import { useState } from "react";
import TipChip from "@/components/TipChip";

const CREATORS = [
  { handle: "ayo_jazz", name: "Ayo Jazz", tips: "9.8K", img: "https://picsum.photos/seed/ayo/120/120" },
  { handle: "bimpe_dance", name: "Bimpe", tips: "5.2K", img: "https://picsum.photos/seed/bimpe/120/120" },
  { handle: "kemi_vibes", name: "Kemi", tips: "1.1K", img: "https://picsum.photos/seed/kemi/120/120" },
  { handle: "tunde_comedy", name: "Tunde", tips: "7.3K", img: "https://picsum.photos/seed/tunde/120/120" },
  { handle: "zara_beats", name: "Zara", tips: "3.4K", img: "https://picsum.photos/seed/zara/120/120" },
  { handle: "chidi_gaming", name: "Chidi", tips: "2.9K", img: "https://picsum.photos/seed/chidi/120/120" },
];

const FILTERS = ["🔥 Trending", "🎵 Music", "🎮 Gaming"];

export default function LandingPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("🔥 Trending");
  const [loadingMore, setLoadingMore] = useState(false);
  const filtered = CREATORS.filter((c) => c.handle.includes(q.toLowerCase()) || c.name.toLowerCase().includes(q.toLowerCase()));

  function loadMore() {
    setLoadingMore(true);
    setTimeout(() => setLoadingMore(false), 900);
  }

  return (
    <div className="pt-4 w-full min-w-0">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-anon-gray">🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search creators"
          placeholder="Search creators …"
          className="w-full rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-4 py-3 text-sm placeholder:text-anon-gray focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-h-[44px]"
        />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold border min-h-[44px] ${filter === f ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-charcoal border-[#E5E7EB]"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <a
            key={c.handle}
            href={`/@${c.handle}`}
            className="group rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow min-h-[48px] flex flex-col"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.img} alt={c.name} width={240} height={240} className="aspect-square w-full object-cover" loading="lazy" sizes="(max-width: 640px) 50vw, 33vw" />
            <div className="p-2 sm:p-3 min-w-0">
              <p className="text-sm font-bold text-charcoal truncate">@{c.handle}</p>
              <p className="text-xs text-anon-gray">{c.tips} tips</p>
            </div>
          </a>
        ))}
      </div>

      {loadingMore && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square rounded-xl shimmer-bg animate-pulse" />
          ))}
        </div>
      )}

      <button
        onClick={loadMore}
        className="mt-4 w-full rounded-xl border border-dashed border-[#E5E7EB] py-3 text-sm font-semibold text-anon-gray hover:text-charcoal min-h-[44px]"
      >
        {loadingMore ? "Loading…" : "Load 12 more →"}
      </button>

      <a
        href="/dashboard"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 inline-flex min-h-[48px] min-w-[120px] max-w-[90vw] items-center justify-center rounded-full bg-brand-blue px-6 sm:px-8 text-sm font-bold text-white shadow-md hover:bg-[#0046CC] animate-pulseBrand focus-visible:ring-2 focus-visible:ring-brand-blue/30"
      >
        Tip Now ✨
      </a>
    </div>
  );
}
