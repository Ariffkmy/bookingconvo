/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'base': ['1.05rem', '1.65rem'],
        'lg': ['1.2rem', '1.85rem'],
        '7xl': ['4.5rem', '1'],
        '8xl': ['6rem', '1'],
      },
      colors: {
        // The Tulip Identity 2026: Pink, White, Black
        primary: '#FFF0F5', // Lavender Blush
        primaryDark: '#BE185D', // Pink-700
        pinkAccent: '#F472B6', // Pink-400 (Softer)
        charcoal: '#121212', // Lifted Black (Graphite)
        charcoalLight: '#1E1E1E', // Lighter Gray for cards
        surface: '#FFFFFF',
        silver: '#F8F9FA',
        gold: '#D4AF37',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['"Outfit"', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 2px 10px rgba(0, 0, 0, 0.05), 0 0 0 1px #bae6fd',
      },
    },
  },
  plugins: [],
}
