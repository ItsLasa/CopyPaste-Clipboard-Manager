import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0E0E10',
          subtle: '#17171A',
          elevated: '#1E1E22',
        },
        fg: {
          DEFAULT: '#F5F5F7',
          muted: '#A1A1AA',
          subtle: '#71717A',
        },
        surface: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.08)',
        accent: {
          DEFAULT: '#7C5CFF',
          hover: '#8E72FF',
          subtle: 'rgba(124,92,255,0.12)',
        },
        danger: '#FF5C5C',
      },
      borderRadius: {
        card: '14px',
        pill: '999px',
        sheet: '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)',
        shelf: '0 12px 40px rgba(0,0,0,0.45)',
        pop: '0 24px 60px rgba(0,0,0,0.55)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tight: '-0.01em',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config
