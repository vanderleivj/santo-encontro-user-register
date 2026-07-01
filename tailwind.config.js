/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
        register: ['Playfair Display', 'serif'],
      },
      colors: {
        primary: '#00255D',
        'background-light': '#fcfcfd',
        'background-dark': '#101622',
        gold: '#d4af37',
        'register-primary': 'var(--register-primary)',
        'register-secondary': 'var(--register-secondary)',
        'register-bg': 'var(--register-bg)',
        'brand-accent': 'var(--brand-accent)',
        'brand-accent-hover': 'var(--brand-accent-hover)',
        'brand-gold': 'var(--brand-gold)',
        'santo-navy': {
          50: '#E8EDF5',
          100: '#C5D4E8',
          200: '#8FA8D0',
          300: '#5A7CB8',
          400: '#2E5599',
          500: '#00255D',
          600: '#051C3F',
          700: '#041832',
          800: '#0A3D7A',
          900: '#020F1E',
        },
        'santo-orange': {
          400: '#FFB347',
          500: '#FF7415',
          600: '#E8650F',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}
