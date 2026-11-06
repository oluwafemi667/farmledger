import type { Config } from "tailwindcss";

/**
 * Design tokens for the "farm ledger" direction.
 *
 * Colour meaning is fixed, not decorative:
 *  - forest   : brand, primary actions, "on or above expected"
 *  - olive    : secondary accent, supporting data series
 *  - stone    : text, rules, neutral/unchanged
 *  - terracotta (attention) : "needs attention" and nothing else
 *  - brick (danger)         : failed sync, destructive actions, validation errors
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#ffffff",
      ivory: {
        50: "rgb(var(--c-ivory-50) / <alpha-value>)",
        100: "rgb(var(--c-ivory-100) / <alpha-value>)", // application background
        200: "rgb(var(--c-ivory-200) / <alpha-value>)", // sunken surfaces, table header
        300: "rgb(var(--c-ivory-300) / <alpha-value>)", // hairline rules
        400: "rgb(var(--c-ivory-400) / <alpha-value>)", // strong rules, input borders
      },
      forest: {
        50: "rgb(var(--c-forest-50) / <alpha-value>)",
        100: "rgb(var(--c-forest-100) / <alpha-value>)",
        600: "rgb(var(--c-forest-600) / <alpha-value>)",
        700: "rgb(var(--c-forest-700) / <alpha-value>)",
        800: "rgb(var(--c-forest-800) / <alpha-value>)", // brand
        900: "rgb(var(--c-forest-900) / <alpha-value>)",
      },
      olive: {
        100: "rgb(var(--c-olive-100) / <alpha-value>)",
        300: "rgb(var(--c-olive-300) / <alpha-value>)",
        500: "rgb(var(--c-olive-500) / <alpha-value>)",
        600: "rgb(var(--c-olive-600) / <alpha-value>)",
      },
      stone: {
        400: "rgb(var(--c-stone-400) / <alpha-value>)",
        500: "rgb(var(--c-stone-500) / <alpha-value>)",
        600: "rgb(var(--c-stone-600) / <alpha-value>)",
        700: "rgb(var(--c-stone-700) / <alpha-value>)",
        800: "rgb(var(--c-stone-800) / <alpha-value>)",
        900: "rgb(var(--c-stone-900) / <alpha-value>)", // ink
      },
      attention: {
        100: "rgb(var(--c-attention-100) / <alpha-value>)",
        500: "rgb(var(--c-attention-500) / <alpha-value>)",
        600: "rgb(var(--c-attention-600) / <alpha-value>)",
        700: "rgb(var(--c-attention-700) / <alpha-value>)",
      },
      // Owner control room (dark surfaces). "wheat" marks the figure that matters
      // on a dark panel, the way terracotta marks attention on ivory.
      night: {
        950: "#050706",
        900: "#0B0F0D",
        800: "#121815",
        700: "#1B2420",
        600: "#28362F",
        500: "#4E6A5C",
        300: "#93A89C",
        200: "#C3D1C8",
        100: "#EAF1EC",
      },
      // Accents that work on black. signal = the brand green (actions, "on track",
      // the active item); wheat = eggs and highlighted figures; sky = secondary
      // data series. Terracotta stays reserved for "needs attention".
      signal: {
        300: "#86E3AE",
        400: "#4FD18B",
        500: "#35B574",
      },
      sky: {
        300: "#8AD0F0",
        400: "#5DB8E3",
      },
      wheat: {
        300: "#EBD28F",
        400: "#E0BC62",
        500: "#CFA23F",
      },
      danger: {
        500: "#B3392B", // filled buttons: identical in both themes
        100: "rgb(var(--c-danger-100) / <alpha-value>)",
        600: "rgb(var(--c-danger-600) / <alpha-value>)",
        700: "rgb(var(--c-danger-700) / <alpha-value>)",
      },
    },
    borderRadius: {
      none: "0",
      sm: "2px",
      DEFAULT: "4px",
      md: "4px",
      lg: "6px",
      full: "9999px",
    },
    fontFamily: {
      // One family for the whole interface; mono carries every figure.
      display: [
        "var(--font-geist-sans)",
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "Roboto",
        "sans-serif",
      ],
      sans: [
        "var(--font-geist-sans)",
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "Roboto",
        "sans-serif",
      ],
      mono: [
        "var(--font-geist-mono)",
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "monospace",
      ],
    },
    fontSize: {
      // Compact, desktop-grade scale. Inputs are forced to 16px on phones in globals.css
      // so iOS never zooms; touch targets stay large through min-height, not type size.
      xs: ["0.75rem", { lineHeight: "1.05rem", letterSpacing: "0.005em" }],
      sm: ["0.8125rem", { lineHeight: "1.25rem" }],
      base: ["0.875rem", { lineHeight: "1.4rem" }],
      lg: ["1rem", { lineHeight: "1.5rem" }],
      xl: ["1.125rem", { lineHeight: "1.6rem", letterSpacing: "-0.01em" }],
      "2xl": ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.015em" }],
      "3xl": ["1.75rem", { lineHeight: "2.1rem", letterSpacing: "-0.02em" }],
      "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.025em" }],
      "5xl": ["3rem", { lineHeight: "3.1rem", letterSpacing: "-0.03em" }],
    },
    extend: {
      colors: {
        // Semantic aliases: components use these, never raw palette steps.
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        brand: "rgb(var(--c-forest-800) / <alpha-value>)",
        positive: "rgb(var(--c-forest-600) / <alpha-value>)",
        neutral: "rgb(var(--c-stone-500) / <alpha-value>)",
      },
      spacing: {
        // Minimum touch target for the farmhand interface.
        touch: "3.5rem",
        "touch-lg": "4.5rem",
      },
      minHeight: { touch: "3.5rem", "touch-lg": "4.5rem" },
      minWidth: { touch: "3.5rem" },
      maxWidth: { page: "80rem", prose: "62ch" },
      transitionTimingFunction: {
        ledger: "cubic-bezier(0.2, 0, 0, 1)",
      },
      transitionDuration: { 150: "150ms" },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "rise-in": "rise-in 180ms cubic-bezier(0.2, 0, 0, 1) both",
      },
    },
  },
  plugins: [],
};
export default config;
