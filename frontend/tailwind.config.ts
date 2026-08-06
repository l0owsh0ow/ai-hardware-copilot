import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#534ab7",
          dark: "#3c3489",
          light: "#eeedfe",
          hover: "#cecbf6",
        },
        surface: "#f5f5f0",
        ink: "#2c2c2a",
        muted: "#888780",
        soft: "#5f5e5a",
        line: "#e0dfd9",
        "line-soft": "#f1efe8",
        inputline: "#d3d1c7",
        success: { DEFAULT: "#0f6e56", bg: "#e1f5ee" },
        info: { DEFAULT: "#185fa5", bg: "#e6f1fb" },
        warn: { DEFAULT: "#854f0b", bg: "#faeeda" },
        price: "#993c1d",
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(44,44,42,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
