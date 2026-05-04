import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        risk: {
          low: "#16a34a",
          mid: "#d97706",
          high: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
