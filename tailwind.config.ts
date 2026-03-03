import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Inter"', '"Satoshi"', 'sans-serif'],
        body: ['"Inter"', '"Satoshi"', 'sans-serif'],
      },
      fontSize: {
        'h1': ['64px', { lineHeight: '1.1', fontWeight: '800' }],
        'h2': ['44px', { lineHeight: '1.2', fontWeight: '800' }],
        'h3': ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '500' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0F3D2E", // Dark Green Day
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#145A41", // Secondary Dark Green Day
          foreground: "#FFFFFF",
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
          DEFAULT: "#0F3D2E",
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "#0F3D2E",
          "primary-foreground": "#FFFFFF",
          accent: "rgba(15, 61, 46, 0.1)",
          "accent-foreground": "#0F3D2E",
          border: "rgba(0, 0, 0, 0.06)",
          ring: "#0F3D2E",
        },
      },
      borderRadius: {
        lg: "28px",
        md: "20px",
        sm: "12px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "water-flow": {
          "0%": { transform: "translate(0, 0) rotate(0deg)" },
          "50%": { transform: "translate(5%, 5%) rotate(2deg)" },
          "100%": { transform: "translate(0, 0) rotate(0deg)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "water-flow": "water-flow 15s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
