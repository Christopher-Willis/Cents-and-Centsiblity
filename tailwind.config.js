/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        midnight: '#0a0d12',
        surface: '#171b21',
        surface2: '#20242c',
        ink: '#f0f2f4',
        'ink-muted': '#8b939f',
        mint: '#13d97f',
        coral: '#ff7d84',
      },
      fontFamily: {
        display: ['BricolageGrotesque_700Bold'],
      },
    },
  },
  plugins: [],
};
