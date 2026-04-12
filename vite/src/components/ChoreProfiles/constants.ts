import { keyframes } from '@emotion/react'

export const DIFFICULTY_COLORS: Record<string, string> = {
  small: '#48BB78',
  medium: '#ECC94B',
  large: '#FC8181',
  'extra large': '#B794F4',
}

// Distinct hues for per-person pie slices
export const PERSON_COLORS = [
  '#4299E1', '#ED8936', '#48BB78', '#ECC94B',
  '#9F7AEA', '#F687B3', '#38B2AC', '#FC8181',
]

export const EXCLUDED_REACTIONS = new Set([
  '❤️', '❤', '💜', '💕', '🩷', '🤍', '🖤', '💙', '💛', '💚', '🧡',
  '🤎', '💝', '💞', '💓', '💗', '💖', '💘', '💟', '❣️', '❣',
  '❤️‍🔥', '❤‍🔥', '❤️‍🩹', '❤‍🩹',
  '🙏', '👏', 'thankyou',
  '✨',
])

export const DAILY_WEIGHTS = { small: 1, medium: 2, large: 4, extraLarge: 6 } as const

export const rainbowPastel = keyframes`
  0%   { background-color: hsl(0, 70%, 82%); }
  16%  { background-color: hsl(55, 70%, 82%); }
  33%  { background-color: hsl(120, 60%, 82%); }
  50%  { background-color: hsl(190, 65%, 82%); }
  66%  { background-color: hsl(240, 65%, 85%); }
  83%  { background-color: hsl(300, 60%, 83%); }
  100% { background-color: hsl(360, 70%, 82%); }
`
