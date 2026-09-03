/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{html,js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-blue": "#0057FF",
        "brand-ink": "#0A1B33",
        "naija-green": "#00A850",
        "warn-amber": "#FF991F",
        "anon-gray": "#6B7280",
        "slate-line": "#E2E8F0",
        charcoal: "#0F1E33",
      },
      fontFamily: {
        body: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.4rem" }],
        xl: ["1.25rem", { lineHeight: "1.3" }],
        "2xl": ["1.5rem", { lineHeight: "1.25" }],
        "3xl": ["1.875rem", { lineHeight: "1.2" }],
      },
      screens: {
        xs: "360px",
        sm: "640px",
      },
      spacing: {
        ...Object.fromEntries(Array.from({ length: 17 }, (_, i) => [String(i), `${i * 4}px`])),
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
        md: "0 4px 6px rgba(0,0,0,0.08)",
        lg: "0 10px 15px rgba(0,0,0,0.12)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        pulseBrand: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
      },
      animation: {
        shimmer: "shimmer 1.2s ease-in-out infinite",
        pulseBrand: "pulseBrand 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
