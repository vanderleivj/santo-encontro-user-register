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
        primary: '#0f49bd',
        'background-light': '#fcfcfd',
        'background-dark': '#101622',
        gold: '#d4af37',
        // Tema da página de cadastro (referência layout)
        'register-primary': '#1A233A',
        'register-secondary': '#3B5284',
        'register-bg': '#F8FAFC',
        'santo-blue': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}
