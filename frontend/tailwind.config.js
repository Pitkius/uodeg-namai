/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FBF8F2",
          100: "#F5F2EA",
          200: "#E8DFD0",
          300: "#D9CDB8"
        },
        navy: {
          700: "#243B6B",
          800: "#1A2B56",
          900: "#132144"
        },
        skyyard: {
          50: "#F0F7FC",
          100: "#E3F0F9",
          200: "#C5DFF0",
          300: "#8EBFDE",
          500: "#4A90C2"
        },
        tan: {
          200: "#E8D9C4",
          400: "#C4A882"
        }
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 8px 28px -12px rgba(26, 43, 86, 0.18)",
        card: "0 6px 20px -8px rgba(26, 43, 86, 0.12)"
      }
    }
  },
  plugins: []
};
