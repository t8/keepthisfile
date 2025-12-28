
/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        neonPurple: '#A855F7', // purple-500
        neonGreen: '#4ADE80', // green-400
        softPurple: '#E9D5FF', // purple-200
        smokedWhite: '#F8F6F3',
        darkText: '#1A1A1A',
        // Keeping legacy names mapped to new colors for safety, though we should use new names
        electricBlue: '#A855F7', 
        neonMint: '#4ADE80',
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        display: ['"Rajdhani"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, rgba(168, 85, 247, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(168, 85, 247, 0.1) 1px, transparent 1px)",
      },
      boxShadow: {
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'neon-green': '0 0 20px rgba(74, 222, 128, 0.3)',
        'vault': '0 20px 50px -12px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
