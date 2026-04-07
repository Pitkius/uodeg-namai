/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 40px -10px rgba(14, 165, 233, 0.2), 0 4px 16px -4px rgba(244, 63, 94, 0.12)",
        card: "0 8px 30px -8px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};

