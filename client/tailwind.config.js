/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Flow — primario
        flow: {
          50:  '#E9F7F4',
          100: '#CDEEE7',
          200: '#9FDDD2',
          300: '#66C7B7',
          400: '#34BFAE',
          500: '#16A394',
          600: '#0F8B7E',
          700: '#0C6F65',
          800: '#0B574F',
          900: '#0A3D38',
          DEFAULT: '#0F8B7E',
        },
        // Spark — accento caldo
        spark: {
          50:  '#FDEDE6',
          100: '#FBD5C6',
          300: '#F8A685',
          500: '#F26B3F',
          600: '#E0552E',
          700: '#BC4222',
          DEFAULT: '#F26B3F',
        },
        // Ink — neutri caldi
        ink: {
          950: '#15140F',
          900: '#211F1A',
          800: '#2E2B25',
          700: '#423E37',
          600: '#5A554B',
          500: '#6E685D',
          400: '#948D80',
          300: '#BCB5A8',
          200: '#DAD4C8',
          100: '#EBE6DC',
          50:  '#F6F3EC',
        },
        paper: '#FBF9F4',
        // Semantici
        success: '#2E9E5B',
        warning: '#E8A13A',
        danger:  '#DB4F44',
        info:    '#0F8B7E',
      },
      fontFamily: {
        display: ['Schibsted Grotesk', 'system-ui', 'sans-serif'],
        sans:    ['Hanken Grotesk', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display:  ['56px', { lineHeight: '1.04', letterSpacing: '-0.025em' }],
        h1:       ['40px', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        h2:       ['30px', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        h3:       ['23px', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        'body-lg':['17px', { lineHeight: '1.6' }],
        body:     ['15px', { lineHeight: '1.6' }],
        sm:       ['13px', { lineHeight: '1.5' }],
        overline: ['11px', { lineHeight: '1', letterSpacing: '0.16em' }],
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '999px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(33,31,26,0.06)',
        sm: '0 2px 6px rgba(33,31,26,0.08)',
        md: '0 6px 20px -6px rgba(33,31,26,0.12)',
        lg: '0 18px 44px -12px rgba(33,31,26,0.20)',
        focus: '0 0 0 3px rgba(15,139,126,0.28)',
      },
      transitionTimingFunction: {
        sf: 'cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
}
