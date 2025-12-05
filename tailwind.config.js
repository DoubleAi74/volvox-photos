/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "neumorphic-bg": "#e0e0e0",
        "neumorphic-text": "#8a8a8a",
        "neumorphic-shadow-light": "#ffffff",
        "neumorphic-shadow-dark": "#bebebe",
      },
      boxShadow: {
        neumorphic: "8px 8px 16px #bebebe, -8px -8px 16px #ffffff",
        "neumorphic-inset":
          "inset 6px 6px 12px #bebebe, inset -6px -6px 12px #ffffff",
        "neumorphic-pressed":
          "inset 4px 4px 8px #bebebe, inset -4px -4px 8px #ffffff",
        "neumorphic-soft": "4px 4px 8px #bebebe, -4px -4px 8px #ffffff",
      },
    },
  },
  plugins: [],
};
