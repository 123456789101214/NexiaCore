/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6", // පස්සේ අපිට ඕන විදිහට colors වෙනස් කරගමු
      }
    },
  },
  plugins: [],
}