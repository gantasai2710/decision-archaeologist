export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0f1b2d', soft: '#4b5a6e', mute: '#8a97a8' },
        accent: { DEFAULT: '#3b82f6', soft: '#eff6ff', line: '#bfdbfe' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: { card: '0 1px 2px rgba(15,27,45,0.04)' },
    },
  },
  plugins: [],
}
