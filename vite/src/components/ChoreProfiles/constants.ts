import { keyframes } from '@emotion/react'
export { EXCLUDED_REACTIONS } from '@atlas/api'

export const DIFFICULTY_COLORS: Record<string, string> = {
  small: '#48BB78',
  medium: '#ECC94B',
  large: '#FC8181',
  'extra large': '#B794F4',
}

// Distinct hues for per-person coloring — spread across the spectrum
export const PERSON_COLORS = [
  '#4299E1', // blue
  '#ED8936', // orange
  '#48BB78', // green
  '#ECC94B', // yellow
  '#9F7AEA', // purple
  '#38B2AC', // teal
  '#FC8181', // red
  '#667EEA', // indigo
  '#F6AD55', // light orange
  '#68D391', // light green
  '#76E4F7', // cyan
  '#B794F4', // lavender
]

// FNV-1a — much better distribution than a polynomial hash for short strings
function hashName(name: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

export function getPersonColor(name: string): string {
  return PERSON_COLORS[hashName(name) % PERSON_COLORS.length]
}


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
