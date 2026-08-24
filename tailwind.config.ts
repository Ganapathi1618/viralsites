import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        surface: '#101010',
        raised: '#141414',
        line: '#1f1f1f',
        accent: '#00ff88',
        'accent-dim': '#00b862',
        muted: '#7a7a7a',
        danger: '#ff4d5e',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(0,255,136,0.28), 0 0 24px -8px rgba(0,255,136,0.45)',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
      },
      animation: {
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
