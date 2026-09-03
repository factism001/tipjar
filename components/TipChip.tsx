"use client";
type TipChipProps = {
  amount: number | string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  label?: string;
};
export default function TipChip({ amount, selected, disabled, onPress, label }: TipChipProps) {
  const display = typeof amount === "number" ? `₦${amount.toLocaleString("en-NG")}` : String(amount);
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "min-h-[44px] min-w-[72px] px-3 py-2 rounded-md text-sm font-semibold border whitespace-nowrap font-mono tnum",
        "flex items-center justify-center gap-1 transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30",
        disabled
          ? "bg-anon-gray/30 text-anon-gray border-transparent cursor-not-allowed"
          : selected
          ? "bg-brand-ink text-white border-brand-ink shadow-sm"
          : "bg-white text-charcoal border-slate-line hover:border-brand-ink/40 hover:bg-[#F8FAFC]",
      ].join(" ")}
    >
      {label ?? display}
    </button>
  );
}
