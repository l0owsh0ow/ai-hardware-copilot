import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // VOLT 电光蓝：--blue #2f6bff / --blue-deep #1c46c6 / --blue-soft #eaf1ff
          50: "#eaf1ff",
          100: "#dbe7ff",
          200: "#b9cfff",
          300: "#8fb4ff",
          400: "#5f8dff",
          500: "#4a80ff",
          600: "#2f6bff",
          700: "#1c46c6",
          800: "#17399f",
          900: "#122c7a",
          950: "#0a1b4d",
        },
        ink: {
          // VOLT 深蓝墨色：--ink #0f1f3d / --muted #5b6b85 / --line #e4eaf4 / --section #f4f7fb
          50: "#f4f7fb",
          100: "#e4eaf4",
          200: "#c6d0de",
          300: "#9aa8bd",
          400: "#75849c",
          500: "#5b6b85",
          600: "#41526f",
          700: "#2c3d5c",
          800: "#1d2d4a",
          900: "#0f1f3d",
          950: "#081226",
        },
        // VOLT 点缀绿：--green #12b76a / --green-soft #e2f7ec
        success: {
          50: "#e2f7ec",
          100: "#c8f0dc",
          200: "#96e3bb",
          300: "#64d69b",
          400: "#35c880",
          500: "#12b76a",
          600: "#0e9f5c",
          700: "#0b844e",
        },
        blue: {
          50: "#eaf1ff",
          100: "#dbe7ff",
          200: "#b9cfff",
          300: "#8fb4ff",
          400: "#5f8dff",
          500: "#4a80ff",
          600: "#2f6bff",
          700: "#1c46c6",
          800: "#17399f",
          900: "#122c7a",
        },
        warning: { 50: "#fffbeb", 100: "#fef3c7", 500: "#f59e0b", 600: "#d97706", 700: "#b45309" },
        danger: { 50: "#fef2f2", 100: "#fee2e2", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c" },
        // shadcn/ui 语义色（映射到 VOLT 令牌）
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["Cubic 11", "Outfit", "Noto Sans SC", "Microsoft YaHei", "system-ui", "-apple-system", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        // 柔和投影统一偏蓝调（避免纯黑阴影）
        xs: "0 1px 2px 0 rgb(15 31 61 / 0.05)",
        sm: "0 1px 3px 0 rgb(15 31 61 / 0.07), 0 1px 2px -1px rgb(15 31 61 / 0.05)",
        md: "0 4px 10px -1px rgb(15 31 61 / 0.08), 0 2px 4px -2px rgb(15 31 61 / 0.05)",
        lg: "0 12px 30px -4px rgb(15 31 61 / 0.10), 0 4px 8px -4px rgb(15 31 61 / 0.05)",
        xl: "0 24px 50px -8px rgb(15 31 61 / 0.14), 0 8px 16px -8px rgb(15 31 61 / 0.06)",
        "2xl": "0 34px 80px -12px rgb(15 31 61 / 0.18)",
        glow: "0 14px 36px rgb(47 107 255 / 0.22)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        pulseSoft: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.7" } },
        floaty: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        blink: { "50%": { opacity: "0" } },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite linear",
        "pulse-soft": "pulseSoft 2s infinite ease-in-out",
        floaty: "floaty 6s cubic-bezier(.22,.61,.36,1) infinite",
        blink: "blink 1s steps(1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
