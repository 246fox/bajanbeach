import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#f2f9fd",
          100: "#dff1fb",
          400: "#6bb8e4",
          500: "#4aa3d8",
          600: "#3c89b8",
          700: "#2f6f98"
        },
        sand: {
          50: "#fefaf2",
          100: "#f8efdc",
          300: "#ecd9b2"
        }
      }
    }
  },
  plugins: []
};

export default config;
