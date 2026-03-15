import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        bg: {
          primary: '#0d0d1a',
          card: 'rgba(255,255,255,0.04)',
          'card-hover': 'rgba(255,255,255,0.08)',
        },
        border: {
          subtle: 'rgba(255,255,255,0.08)',
          active: 'rgba(74,144,217,0.4)',
        },
        text: {
          primary: '#ffffff',
          secondary: '#aaaaaa',
          muted: '#666666',
        },
        accent: {
          peach: '#F4A261',
          blue: '#4A90D9',
          'blue-dark': '#1B3A5C',
        },
        danger: '#E74C3C',
        success: '#2D8A6E',
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
