/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Fredoka One"', 'Fredoka', '"Fredoka Fallback"', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        dark: {
          900: '#070b19', // Deeper space
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
        },
        primary: {
          400: '#22d3ee', // Cyan
          500: '#06b6d4', // Bright Neon Cyan for Crewmates
          600: '#0891b2',
        },
        danger: {
          500: '#ef4444', 
          600: '#dc2626', // Aggressive crimson
          900: '#7f1d1d',
        },
        accent: '#8b5cf6',
      }
    },
  },
  plugins: [],
}
