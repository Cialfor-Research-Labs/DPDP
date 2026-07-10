/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: '#03030a',
        violet: '#7c3aed',
        'violet-light': '#a78bfa',
        cyan: '#06b6d4',
        'cyan-light': '#67e8f9',
        ink: "#11212d",
        mist: "#dbe8ef",
        clay: "#f3ede3",
        signal: "#cb5a2e"
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
      },
    },
  },
  plugins: [],
};
