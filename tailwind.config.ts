import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces. #f5f5f5 is the spec's divider tone; borders step one shade
        // darker so a 1px line is actually visible against white.
        page: '#ffffff',
        subtle: '#fafafa',
        fill: '#f5f5f5',
        line: '#ebebeb',
        // Text
        ink: '#0a0a0a',
        body: '#404040',
        muted: '#8a8a8a',
        // Accents
        brand: '#0066ff',
        'brand-dark': '#0052cc',
        money: '#16a34a',
        down: '#dc2626',
        // Model tags
        'tag-bid': '#0066ff',
        'tag-pixel': '#7c3aed',
        'tag-board': '#ea580c',
        'tag-sponsor': '#16a34a',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      maxWidth: { shell: '1360px' },
      keyframes: {
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        popIn: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.99)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-in': 'slideIn 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        'pop-in': 'popIn 160ms ease-out',
      },
    },
  },
  plugins: [],
}

export default config
