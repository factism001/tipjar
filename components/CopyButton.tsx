"use client";
import { useState } from "react";
type Props = { text: string; label?: string; anon?: boolean };
export default function CopyButton({ text, label = "Copy", anon }: Props) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    const payload = anon ? "anonymous" : text;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = payload;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    if (navigator.vibrate) navigator.vibrate(30);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : label}
      className={[
        "inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3 rounded-full text-xs font-semibold border",
        copied ? "bg-naija-green text-white border-naija-green" : "bg-white text-charcoal border-[#E5E7EB] hover:bg-brand-blue hover:text-white hover:border-brand-blue",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30",
      ].join(" ")}
    >
      {copied ? (
        <>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-naija-green text-[10px]">✓</span>
          Copied! ✨
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
