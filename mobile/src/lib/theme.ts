/** Matches the web app's dark + indigo identity. */
export const theme = {
  color: {
    bg: '#0b0d12',
    surface: '#161c25',
    surfaceAlt: '#1d242f',
    border: '#2a3340',
    borderSoft: '#222a35',
    text: '#eef2f7',
    textMid: '#a8b4c4',
    textDim: '#6f7d90',
    accent: '#6366f1',
    accentSoft: 'rgba(99,102,241,0.15)',
    success: '#34d399',
    warning: '#f0a93c',
    danger: '#f07a97',
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
  },
  space: (n: number) => n * 4,
} as const

export type Theme = typeof theme
