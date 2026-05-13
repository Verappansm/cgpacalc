'use client'

import { useMemo } from 'react'
import { generateCurvePoints, GRADE_META, type GradeBand } from '@/lib/distribution'

interface BellCurveProps {
  mean: number
  sigma: number
  bands: GradeBand[]
  studentMin: number
  studentMax: number
}

const VW = 680
const VH = 220
const PAD = { top: 30, right: 20, bottom: 40, left: 20 }
const CW = VW - PAD.left - PAD.right
const CH = VH - PAD.top - PAD.bottom
const BL = PAD.top + CH // baseline y

const toX = (m: number) => PAD.left + (Math.max(0, Math.min(100, m)) / 100) * CW
const toY = (d: number, maxD: number) => PAD.top + CH - (d / maxD) * CH

export function BellCurve({ mean, sigma, bands, studentMin, studentMax }: BellCurveProps) {
  const { areaPath, linePoints } = useMemo(() => {
    const pts = generateCurvePoints(mean, sigma)
    const maxD = Math.max(...pts.map(p => p.y)) * 1.08

    const svg = pts.map(p => ({ sx: toX(p.x), sy: toY(p.y, maxD) }))

    let area = `M ${svg[0].sx} ${BL} L ${svg[0].sx} ${svg[0].sy}`
    for (let i = 1; i < svg.length; i++) area += ` L ${svg[i].sx} ${svg[i].sy}`
    area += ` L ${svg[svg.length - 1].sx} ${BL} Z`

    const line = svg.map(p => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ')

    return { areaPath: area, linePoints: line }
  }, [mean, sigma])

  const sMin = Math.max(0, Math.min(100, studentMin))
  const sMax = Math.max(0, Math.min(100, studentMax))
  const TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full h-auto text-foreground"
      role="img"
      aria-label="Bell curve showing grade distribution"
    >
      <defs>
        {bands.map(b => b.min <= b.max && (
          <clipPath key={b.grade} id={`bc-${b.grade}`}>
            <rect
              x={toX(b.min)}
              y={PAD.top - 6}
              width={toX(Math.min(b.max + 1, 100)) - toX(b.min)}
              height={CH + 6}
            />
          </clipPath>
        ))}
      </defs>

      {/* Grade-colored fill areas */}
      {bands.map(b => b.min <= b.max && (
        <path
          key={b.grade}
          d={areaPath}
          fill={GRADE_META[b.grade].fill}
          clipPath={`url(#bc-${b.grade})`}
        />
      ))}

      {/* Grade boundary dashed lines (at each grade's lower bound, except F) */}
      {bands.slice(0, -1).map(b => (
        <line
          key={`bd-${b.grade}`}
          x1={toX(b.min)} y1={PAD.top - 6}
          x2={toX(b.min)} y2={BL}
          stroke={GRADE_META[b.grade].stroke}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.55}
        />
      ))}

      {/* Student range shaded band */}
      {sMax > sMin && (
        <rect
          x={toX(sMin)} y={PAD.top - 6}
          width={toX(sMax) - toX(sMin)}
          height={CH + 6}
          fill="rgba(0,0,0,0.08)"
        />
      )}

      {/* Student min/max vertical lines */}
      <line x1={toX(sMin)} y1={PAD.top - 10} x2={toX(sMin)} y2={BL} stroke="currentColor" strokeWidth={2} />
      <line x1={toX(sMax)} y1={PAD.top - 10} x2={toX(sMax)} y2={BL} stroke="currentColor" strokeWidth={2} />
      <text x={toX(sMin)} y={PAD.top - 13} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.8}>{studentMin}</text>
      <text x={toX(sMax)} y={PAD.top - 13} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.8}>{studentMax}</text>

      {/* Bell curve stroke */}
      <polyline points={linePoints} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" opacity={0.85} />

      {/* Mean dashed line */}
      <line x1={toX(mean)} y1={PAD.top} x2={toX(mean)} y2={BL} stroke="currentColor" strokeWidth={1.5} strokeDasharray="6 3" opacity={0.3} />

      {/* X-axis */}
      <line x1={PAD.left} y1={BL} x2={VW - PAD.right} y2={BL} stroke="currentColor" strokeWidth={1} opacity={0.2} />

      {/* Ticks */}
      {TICKS.map(t => (
        <g key={t}>
          <line x1={toX(t)} y1={BL} x2={toX(t)} y2={BL + 5} stroke="currentColor" strokeWidth={1} opacity={0.3} />
          <text x={toX(t)} y={BL + 16} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.55}>{t}</text>
        </g>
      ))}

      {/* Grade labels inside bands */}
      {bands.map(b => {
        if (b.min > b.max) return null
        const bw = toX(Math.min(b.max + 1, 100)) - toX(b.min)
        if (bw < 18) return null
        return (
          <text
            key={`lbl-${b.grade}`}
            x={toX(b.min) + bw / 2}
            y={PAD.top + 16}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={GRADE_META[b.grade].stroke}
            opacity={0.85}
          >
            {b.grade}
          </text>
        )
      })}

      {/* Mean label */}
      <text x={toX(mean)} y={BL + 30} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.45}>
        μ={mean.toFixed(1)}
      </text>
    </svg>
  )
}
