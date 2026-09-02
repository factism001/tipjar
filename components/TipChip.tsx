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
        "min-h-[44px] min-w-[72px] px-3 py-2 rounded-full text-sm font-semibold border whitespace-nowrap",
        "flex items-center justify-center gap-1 transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30",
        disabled
          ? "bg-anon-gray/30 text-anon-gray border-transparent cursor-not-allowed"
          : selected
          ? "bg-brand-blue text-white border-brand-blue ring-2 ring-brand-blue/30 shadow-sm"
          : "bg-white text-charcoal border-[#E5E7EB] hover:border-brand-blue/30 hover:bg-brand-blue/[0.04]",
      ].join(" ")}
    >
      {label ?? display}
    </button>
  );
}
