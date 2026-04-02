/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'safe-green': '#059669',
        'danger-red': '#DC2626',
      }
    },
  },
  plugins: [],
}