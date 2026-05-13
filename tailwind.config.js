/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        nlOrange: {
          50: '#fff3ed',
          100: '#ffe4d4',
          200: '#ffc8a8',
          300: '#ffa472',
          400: '#ff7432',
          500: '#ff550a', // Primary NL Oranje
          600: '#f03e00',
          700: '#c82c02',
          800: '#9f230b',
          900: '#80210e',
        },
        background: '#FAFAFA', // Light grey/creme background for clean look
      },
      fontFamily: {
        // We'll map this later to expo-fonts (e.g. Nunito)
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
