import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#000000",
          100: "#121212",
          200: "#1a1a1a",
          300: "#242424",
          400: "#2a2a2a",
          500: "#3a3a3a",
          600: "#b3b3b3",
          700: "#d9d9d9",
          800: "#ededed",
          900: "#f5f5f5",
        },
        primary: {
          500: "#1db954",
          700: "#169c46",
        },
        accent: {
          green: "#1db954",
        },
      },
    },
  },
  plugins: [],
};

export default config;
