/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Usamos class para poder tener el toggle manual o detectar el sistema
  theme: {
    extend: {
      colors: {
        bingo: {
          dark: '#0f172a',
          card: '#1e293b',
          accent: '#10b981', // Emerald green para destacar venta
          reserved: '#f59e0b', // Amber para reservado
          sold: '#ef4444', // Red para vendido
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      animation: {
        'pop': 'pop 0.25s ease-out',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
