"use client";
import AuthGuard from "@/components/AuthGuard";
import RealtimeTable from "@/components/RealtimeTable";

const DEMO_TIPS = [
  { id: "t1", amount: 5000, tipper: "anonymous", is_anonymous: true, created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), message: "Fire content!" },
  { id: "t2", amount: 2000, tipper: "@bobway", is_anonymous: false, created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), message: "More please" },
  { id: "t3", amount: 1000, tipper: "@sarah", is_anonymous: false, created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(), message: "" },
];

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="pt-4">
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl bg-naija-green text-white p-4">
            <p className="text-xs opacity-80">Total raised</p>
            <p className="text-xl font-bold">₦212,450</p>
          </div>
          <div className="flex-1 rounded-xl bg-warn-amber text-white p-4">
            <p className="text-xs opacity-80">Tippers today</p>
            <p className="text-xl font-bold">1,842</p>
          </div>
        </div>

        <div className="mt-6">
          <RealtimeTable initialTips={DEMO_TIPS} />
        </div>

        <button
          onClick={() => {
            const rows = [["amount", "tipper", "date"], ...DEMO_TIPS.map((t) => [String(t.amount), t.tipper, t.created_at])];
            const csv = rows.map((r) => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "tips.csv"; a.click(); URL.revokeObjectURL(url);
          }}
          className="fixed bottom-6 right-4 z-30 inline-flex min-h-[44px] items-center rounded-full bg-charcoal px-5 text-sm font-semibold text-white shadow-md hover:bg-black"
        >
          Export CSV
        </button>
      </div>
    </AuthGuard>
  );
}
