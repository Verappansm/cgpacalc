export const GRADE_POINTS: Record<string, number> = {
  S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0,
}

export const GRADE_ORDER = ['S', 'A', 'B', 'C', 'D', 'E', 'F'] as const
export type Grade = typeof GRADE_ORDER[number]

export const GRADE_CONFIG: Record<Grade, {
  points: number
  label: string
  color: string       // tailwind text
  bg: string          // tailwind bg
  border: string      // tailwind border
  hex: string         // raw hex for SVG/recharts
  fillHex: string     // semi-transparent hex
}> = {
  S: { points: 10, label: 'Outstanding', color: 'text-emerald-400', bg: 'bg-emerald-950/60', border: 'border-emerald-800/60', hex: '#34d399', fillHex: 'rgba(52,211,153,0.20)' },
  A: { points: 9,  label: 'Excellent',   color: 'text-blue-400',    bg: 'bg-blue-950/60',    border: 'border-blue-800/60',    hex: '#60a5fa', fillHex: 'rgba(96,165,250,0.20)'  },
  B: { points: 8,  label: 'Very Good',   color: 'text-violet-400',  bg: 'bg-violet-950/60',  border: 'border-violet-800/60',  hex: '#a78bfa', fillHex: 'rgba(167,139,250,0.20)' },
  C: { points: 7,  label: 'Good',        color: 'text-yellow-400',  bg: 'bg-yellow-950/60',  border: 'border-yellow-800/60',  hex: '#facc15', fillHex: 'rgba(250,204,21,0.20)'  },
  D: { points: 6,  label: 'Average',     color: 'text-orange-400',  bg: 'bg-orange-950/60',  border: 'border-orange-800/60',  hex: '#fb923c', fillHex: 'rgba(251,146,60,0.20)'  },
  E: { points: 5,  label: 'Pass',        color: 'text-red-400',     bg: 'bg-red-950/60',     border: 'border-red-800/60',     hex: '#f87171', fillHex: 'rgba(248,113,113,0.20)' },
  F: { points: 0,  label: 'Fail',        color: 'text-red-300',     bg: 'bg-red-950/80',     border: 'border-red-900',        hex: '#fca5a5', fillHex: 'rgba(252,165,165,0.15)' },
}

export const NAV_ITEMS = [
  { id: 'gpa',       label: 'GPA',            icon: 'Calculator' },
  { id: 'cgpa',      label: 'CGPA',           icon: 'TrendingUp' },
  { id: 'grade',     label: 'Grade Predictor', icon: 'Target'     },
  { id: 'analytics', label: 'Analytics',       icon: 'BarChart3'  },
] as const

export type TabId = typeof NAV_ITEMS[number]['id']

// d2 constant for n=65 (expected range of std-normal sample ≈ 4.71)
export const D2_N65 = 4.71
// Correlation factor: σ_total = σ_int × √(1+(40/60)²+2×0.7×(40/60))
export const TOTAL_SIGMA_SCALE = Math.sqrt(1 + (40 / 60) ** 2 + 2 * 0.7 * (40 / 60))
