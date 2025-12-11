/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        secondary: '#06b6d4',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};