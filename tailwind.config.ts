import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'sans-serif'],
      },
      colors: {
        bg: {
          primary: '#0B0F1A',
          surface: '#0F1320',
          card: '#1E2433',
          'card-hover': '#252B3B',
        },
        border: {
          subtle: 'rgba(148,163,184,0.12)',
          hover: 'rgba(255,107,53,0.3)',
          active: 'rgba(37,99,235,0.4)',
        },
        text: {
          primary: '#FAF8F5',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        accent: {
          pulse: '#FF6B35',
          'pulse-40': '#FF8F5E',
          'pulse-70': '#CC4E1F',
          signal: '#2563EB',
          'signal-40': '#4F8FFF',
          'signal-dark': '#1A4BC2',
          // Legacy aliases
          peach: '#FF6B35',
          blue: '#2563EB',
          'blue-dark': '#1A4BC2',
        },
        danger: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
        mist: '#94A3B8',
      },
      maxWidth: {
        app: '520px',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
} satisfies Config
