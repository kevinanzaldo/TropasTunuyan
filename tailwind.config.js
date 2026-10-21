/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Verde militar / oliva institucional de Tropas Tunuyán */
        militar: {
          50:  '#f4f7ec',
          100: '#e6ecd3',
          200: '#cfdaab',
          300: '#b1c27a',
          400: '#96ab52',
          500: '#7a9237',
          600: '#6B8E23',  /* Color primario del logotipo */
          700: '#4d6a1a',
          800: '#3f5418',
          900: '#364819',
          950: '#1b2709',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Rajdhani', 'system-ui', 'sans-serif'],
        tactical: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
