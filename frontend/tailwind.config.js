/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#11212d",
        mist: "#dbe8ef",
        clay: "#f3ede3",
        signal: "#cb5a2e"
      }
    }
  },
  plugins: []
};
