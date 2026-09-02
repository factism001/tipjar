"use client";
export default function ShimmerCard({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm overflow-hidden">
          <div className="flex gap-3">
            <div className="h-20 w-20 shrink-0 rounded-full shimmer-bg relative overflow-hidden">
              <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-3/4 rounded shimmer-bg relative overflow-hidden">
                <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: `${i * 120}ms` }} />
              </div>
              <div className="h-3 w-1/2 rounded shimmer-bg relative overflow-hidden">
                <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: `${i * 120 + 80}ms` }} />
              </div>
              <div className="h-3 w-1/3 rounded shimmer-bg relative overflow-hidden">
                <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: `${i * 120 + 160}ms` }} />
              </div>
            </div>
          </div>
          <div className="mt-3 h-14 w-full rounded-lg shimmer-bg relative overflow-hidden">
            <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: `${i * 120 + 200}ms` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
