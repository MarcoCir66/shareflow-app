/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:    { DEFAULT: '#0F1C2E', light: '#1A2F4A' },
        blue:    { DEFAULT: '#0078D4', electric: '#00B4FF' },
        slate:   { DEFAULT: '#1E2A3A', mid: '#2D3E50', light: '#8899AA' },
        surface: { DEFAULT: '#F3F6F9', card: '#FFFFFF' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
