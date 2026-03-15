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
          50: "#f7f3ea",
          100: "#eadfc9",
          200: "#dbc8a1",
          300: "#cab176",
          400: "#b99a51",
          500: "#a68437",
          600: "#886a2d",
          700: "#6b5223",
          800: "#4d3a18",
          900: "#30230e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
