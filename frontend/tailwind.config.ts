import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        brand: {
          50: "#f0f6ff", 100: "#e1edff", 200: "#c4dcff", 300: "#9cc3ff",
          400: "#6ea6ff", 500: "#0a84ff", 600: "#0071e3", 700: "#0060c9",
          800: "#004f9e", 900: "#003a73", 950: "#00264d",
        },
        ink: {
          50: "#f5f5f7", 100: "#e8e8ed", 200: "#d2d2d7", 300: "#b8b8be",
          400: "#86868b", 500: "#6e6e73", 600: "#55555a", 700: "#3a3a3e",
          800: "#1d1d1f", 900: "#161617", 950: "#0a0a0b",
        },
        success: { 50: "#f0fbf4", 100: "#dcf4e4", 500: "#34c759", 600: "#248a3d", 700: "#1d6b31" },
        warning: { 50: "#fffaf0", 100: "#ffeed4", 500: "#ff9f0a", 600: "#c93400", 700: "#a02b00" },
        danger: { 50: "#fff0ef", 100: "#ffd9d6", 500: "#ff3b30", 600: "#d70015", 700: "#b31212" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        sm: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
        md: "0 4px 6px -1px rgb(15 23 42 / 0.07), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
        lg: "0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.03)",
        xl: "0 20px 25px -5px rgb(15 23 42 / 0.1), 0 8px 10px -6px rgb(15 23 42 / 0.04)",
        "2xl": "0 25px 50px -12px rgb(15 23 42 / 0.15)",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        pulseSoft: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.7" } },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite linear",
        "pulse-soft": "pulseSoft 2s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
