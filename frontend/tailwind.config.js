/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        smartcd: {
          bgMain: '#061124',
          bgCard: '#081329',
          bgPanel: '#0A1429',
          primaryBlue: '#1D8DEE',
          accentGreen: '#00E676',
          accentYellow: '#FFD54F',
          accentCyan: '#4DD0E1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  corePlugins: {
    preflight: false
  }
};
