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
        amu: {
          green: "#0f5132",
          darkgreen: "#0a3622",
          lightgreen: "#d1e7dd",
          gold: "#c59b27",
          maroon: "#781d28"
        }
      }
    },
  },
  plugins: [],
};
export default config;
