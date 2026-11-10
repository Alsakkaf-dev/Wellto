import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3eee4",
        card: "#fffdf8",
        ink: "#1c1915",
        muted: "#6b6458",
        line: "#e4d9c6",
        moss: "#1f6b4a",
        brass: "#8a6232",
        tide: "#2f5d73",
        clay: "#8f3d1b",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 32px rgba(70, 48, 18, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
