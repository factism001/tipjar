"use client";
type Props = { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean };
export default function AnonToggle({ checked, onChange, disabled }: Props) {
  return (
    <label className={`flex items-center gap-3 ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-[24px] w-[44px] shrink-0 rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30",
          checked ? "bg-naija-green" : "bg-anon-gray",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none block h-[20px] w-[20px] rounded-full bg-white shadow-sm ring-0 transition-transform",
            checked ? "translate-x-[20px]" : "translate-x-0",
          ].join(" ")}
        />
      </button>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-charcoal">Tip anonymously</span>
        <span className="text-xs text-anon-gray">Your name no go show</span>
      </span>
    </label>
  );
}
