/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./src/popup/index.html",
    "./src/options/index.html"
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a', // Deep ocean blue-slate
        glassBg: 'rgba(15, 23, 42, 0.65)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        neonCyan: '#06b6d4',
        neonPurple: '#a855f7',
        neonBlue: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      backdropBlur: {
        glass: '16px',
      },
      boxShadow: {
        neonGlow: '0 0 15px -3px rgba(6, 182, 212, 0.4)',
        purpleGlow: '0 0 15px -3px rgba(168, 85, 247, 0.4)',
      }
    },
  },
  plugins: [],
}
