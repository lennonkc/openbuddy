import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    fontFamily: {
      sans: ['"Nunito"', '"ZCOOL KuaiLe"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    extend: {
      colors: {
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
        candy: {
          cream: "#FFFDF7",
          "cream-dark": "#FFF5E6",
          border: "#FFE0B2",
          yellow: "#FFD93D",
          pink: "#FF6B9D",
          green: "#7BC67E",
          blue: "#64B5F6",
          purple: "#BA8FDB",
          orange: "#FFA502",
          cocoa: "#3D2E1F",
          caramel: "#6B5744",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        candy: "0 2px 12px rgba(255,183,61,0.06)",
        "candy-hover": "0 4px 16px rgba(255,183,61,0.12)",
        "candy-float": "0 2px 8px rgba(0,0,0,0.06)",
      },
      keyframes: {
        "deco-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "jelly": {
          "0%": { transform: "scale(0.95)" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "60%": { transform: "scale(1.02)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fade-in-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "sticker-help-fade": {
          "0%": { opacity: "1" },
          "75%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "deco-float": "deco-float 4s ease-in-out infinite",
        "jelly": "jelly 0.3s ease-out",
        "pop-in": "pop-in 0.25s ease-out",
        "fade-in-up": "fade-in-up 0.3s ease-out both",
        "sticker-help-fade": "sticker-help-fade 7s ease-out forwards",
      },
    },
  },
  plugins: [typography],
};
