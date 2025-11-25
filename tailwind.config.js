/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        outcome: '#FFF9C4',
        opportunity: '#BBDEFB',
        solution: '#C8E6C9',
        'sub-opportunity': '#E1BEE7',
        connection: '#757575',
        canvas: '#FAFAFA',
      },
    },
  },
  plugins: [],
}

