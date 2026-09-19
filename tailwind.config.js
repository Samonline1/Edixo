/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'yt-bg': '#282828', // Charcoal
        'yt-red': '#FF0000', // YouTube Red
        'yt-surface': '#1F1F1F',
        'yt-text': '#F1F1F1',
        'yt-text-muted': '#AAAAAA',
      }
    },
  },
  plugins: [],
}
