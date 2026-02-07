/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        cream:  '#FAF9F6',
        beige:  '#F3F2EE',
        sand:   '#E5E4E0',
        ink:    '#1A1A1A',
        muted:  '#6B6B6B',
        brand: {
          50:  '#F2F7F4',
          100: '#E0ECE4',
          200: '#C1D9C9',
          300: '#A3C6AF',
          400: '#8FB89E',
          500: '#7BAA8F',
          600: '#6A9A7E',
          700: '#5A8A6E',
          800: '#4A7A5E',
          900: '#1A1A1A',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
