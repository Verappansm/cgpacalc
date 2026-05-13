export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export const GRADE_META: Record<Grade, {
  fill: string; stroke: string; text: string; bg: string; label: string
}> = {
  S: { fill: 'rgba(16,185,129,0.22)',  stroke: '#059669', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40',  label: 'Outstanding' },
  A: { fill: 'rgba(59,130,246,0.22)',  stroke: '#2563eb', text: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-950/40',         label: 'Excellent'    },
  B: { fill: 'rgba(139,92,246,0.22)',  stroke: '#7c3aed', text: 'text-violet-600 dark:text-violet-400',   bg: 'bg-violet-50 dark:bg-violet-950/40',     label: 'Very Good'    },
  C: { fill: 'rgba(234,179,8,0.22)',   stroke: '#ca8a04', text: 'text-yellow-600 dark:text-yellow-400',   bg: 'bg-yellow-50 dark:bg-yellow-950/40',     label: 'Good'         },
  D: { fill: 'rgba(249,115,22,0.22)',  stroke: '#ea580c', text: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-950/40',     label: 'Average'      },
  E: { fill: 'rgba(239,68,68,0.22)',   stroke: '#dc2626', text: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/40',           label: 'Pass'         },
  F: { fill: 'rgba(120,53,15,0.18)',   stroke: '#92400e', text: 'text-amber-800 dark:text-amber-300',     bg: 'bg-amber-100 dark:bg-amber-950/60',      label: 'Fail'         },
}

function stdNormPDF(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)
}

function stdNormCDF(z: number): number {
  if (z < -8) return 0
  if (z > 8) return 1
  const b = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429]
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  let poly = 0
  for (let i = b.length - 1; i >= 0; i--) poly = poly * t + b[i]
  const result = 1 - stdNormPDF(Math.abs(z)) * t * poly
  return z >= 0 ? result : 1 - result
}

export function skewNormalPDF(x: number, mean: number, sigma: number, alpha: number): number {
  const delta = alpha / Math.sqrt(1 + alpha * alpha)
  const omega = sigma / Math.sqrt(1 - (2 * delta * delta) / Math.PI)
  const xi = mean - omega * delta * Math.sqrt(2 / Math.PI)
  const z = (x - xi) / omega
  return (2 / omega) * stdNormPDF(z) * stdNormCDF(alpha * z)
}

export type GradeBand = {
  grade: Grade
  min: number
  max: number
  formula: string
}

export function computeGradeBands(mean: number, sigma: number): GradeBand[] {
  const snap = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
  const sRaw  = snap(mean + 1.5 * sigma)
  const sMin  = Math.max(sRaw, 90)
  const a0    = snap(mean + 0.5 * sigma)
  const b0    = snap(mean - 0.5 * sigma)
  const c0    = snap(mean - 1.0 * sigma)
  const d0    = snap(mean - 1.5 * sigma)
  const e0    = snap(mean - 2.0 * sigma)

  return [
    { grade: 'S', min: sMin,      max: 100,       formula: `≥ ${sMin} (μ+1.5σ, min 90%)` },
    { grade: 'A', min: a0,        max: sMin - 1,  formula: `${a0} – ${sMin - 1}`          },
    { grade: 'B', min: b0,        max: a0 - 1,    formula: `${b0} – ${a0 - 1}`            },
    { grade: 'C', min: c0,        max: b0 - 1,    formula: `${c0} – ${b0 - 1}`            },
    { grade: 'D', min: d0,        max: c0 - 1,    formula: `${d0} – ${c0 - 1}`            },
    { grade: 'E', min: e0,        max: d0 - 1,    formula: `${e0} – ${d0 - 1}`            },
    { grade: 'F', min: 0,         max: e0 - 1,    formula: `0 – ${e0 - 1}`                },
  ]
}

export function gradeForMark(mark: number, bands: GradeBand[]): Grade {
  for (const b of bands) {
    if (mark >= b.min && mark <= b.max) return b.grade
  }
  return 'F'
}

export function generateCurvePoints(mean: number, sigma: number, steps = 400): Array<{ x: number; y: number }> {
  const ALPHA = -2.5
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100
    pts.push({ x, y: skewNormalPDF(x, mean, sigma, ALPHA) })
  }
  return pts
}

// d2 constant for n=60: expected range of standard normal sample ≈ 4.64
// Source: NIST/SEMATECH e-Handbook of Statistical Methods, Table for d2
const D2_N60 = 4.64

// Correlation assumption between internal and external exam performance.
// ρ=0.7 is typical for exam scores at the same institution.
// σ_total = σ_int × √(1 + (40/60)² + 2ρ×(40/60)) with ρ=0.7
const TOTAL_SCALE = Math.sqrt(1 + (40 / 60) ** 2 + 2 * 0.7 * (40 / 60)) // ≈ 1.542

export function estimateSigma(
  maxInternal: number,
  minInternal: number,
): number {
  const rangeInt = Math.max(0, maxInternal - minInternal)
  const sigmaInt = rangeInt / D2_N60
  return Math.max(1, sigmaInt * TOTAL_SCALE)
}

// When class range is unknown: CV = 18% of mean (typical for VIT)
export function fallbackSigma(classTotalMean: number): number {
  return Math.max(1, classTotalMean * 0.18)
}
