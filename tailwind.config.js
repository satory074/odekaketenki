/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    {
      pattern:
        /^(bg|text|ring|border|fill|stroke|from|to)-(orange|sky|blue|indigo|violet|amber|emerald|rose|stone|slate)-(50|100|200|300|400|500|600|700|800|900)$/,
    },
    "bg-emerald-50",
    "bg-amber-50",
    "bg-rose-50",
    "text-emerald-700",
    "text-amber-700",
    "text-rose-700",
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

module.exports = config;
