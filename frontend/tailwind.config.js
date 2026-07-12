/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        border: 'var(--border)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        stamp: '3px',
      },
    },
  },
  plugins: [],
}
