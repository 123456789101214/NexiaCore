/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/react-tailwindcss-datepicker/dist/index.esm.js",
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