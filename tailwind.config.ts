import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        border: "var(--border)",
        "brand-white": "#FFFFFF",
        "brand-navy": {
          DEFAULT: "#20283B",
          50: "#f4f4f5",
          100: "#e9eaeb",
          200: "#c7c9ce",
          300: "#a6a9b1",
          400: "#636976",
          500: "#20283B",
          600: "#1b2232",
          700: "#161c29",
          800: "#121620",
          900: "#0d1018",
        },
        "brand-gold": {
          DEFAULT: "#C3B59B",
          50: "#fcfbfa",
          100: "#f9f8f5",
          200: "#f0ede6",
          300: "#e7e1d7",
          400: "#d5cbb9",
          500: "#C3B59B",
          600: "#a69a84",
          700: "#897f6d",
          800: "#6b6455",
          900: "#4e483e",
        },
        "brand-navy-tint": "#E7EAF2",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "sans-serif"],
      },
      boxShadow: {
        brand: "0 20px 40px -12px rgba(32, 40, 59, 0.25)",
        gold: "0 10px 24px -6px rgba(166, 154, 132, 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
