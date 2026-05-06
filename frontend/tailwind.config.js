/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          900: '#0a2240',
          800: '#0d2d57',
          700: '#103a70',
          600: '#1a4f9c',
          500: '#2563b8',
          400: '#4a7fd4',
          300: '#7aaae0',
          100: '#dbeafe',
          50:  '#eff6ff',
        },
        accent: {
          DEFAULT: '#e8720c',
          light: '#fef3ea',
        },
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#0284c7',
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        elevated: '0 4px 16px rgba(0,0,0,0.10)',
      },
      backgroundColor: {
        base: '#f4f6f9',
      },
    },
  },
  plugins: [],
}
