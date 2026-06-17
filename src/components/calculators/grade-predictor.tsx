'use client'

import { useMemo, useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { AlertTriangle, Info, RotateCcw, ChevronUp, ChevronDown, Sparkles, FlaskConical, BookOpen } from 'lucide-react'
import { useStore } from '@/store/calculator-store'
import { GRADE_CONFIG, type Grade } from '@/lib/constants'
import {
  computeGradeBands, gradeForMark, generateCurvePoints,
  fallbackSigma, estimateSigma, getD2, type GradeBand,
} from '@/lib/distribution'
import { cn } from '@/lib/utils'

type ChartPoint = { x: number; totalCurve: number } & Partial<Record<Grade, number>>

// ── Lab grade (pure threshold, no bell curve) ─────────────────────────────────
function labGradeForTotal(total: number): Grade {
  if (total >= 90) return 'S'
  if (total >= 80) return 'A'
  if (total >= 70) return 'B'
  if (total >= 60) return 'C'
  if (total >= 50) return 'D'
  if (total >= 40) return 'E'
  return 'F'
}

const LAB_THRESHOLDS: { grade: Grade; min: number; label: string }[] = [
  { grade: 'S', min: 90, label: '≥ 90' },
  { grade: 'A', min: 80, label: '80 – 89' },
  { grade: 'B', min: 70, label: '70 – 79' },
  { grade: 'C', min: 60, label: '60 – 69' },
  { grade: 'D', min: 50, label: '50 – 59' },
  { grade: 'E', min: 40, label: '40 – 49' },
  { grade: 'F', min: 0,  label: '< 40' },
]

// ── Percentile helper ─────────────────────────────────────────────────────────
function percentile(studentTotal: number, mean: number, sigma: number) {
  const z = (studentTotal - mean) / sigma
  if (z < -6) return 0
  if (z > 6) return 100
  const b = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429]
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)
  let poly = 0
  for (let i = b.length - 1; i >= 0; i--) poly = poly * t + b[i]
  const cdf = z >= 0 ? 1 - pdf * t * poly : pdf * t * poly
  return Math.round(cdf * 100)
}

function marksForNextGrade(studentTotal: number, bands: GradeBand[]) {
  const order: Grade[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S']
  const current = gradeForMark(studentTotal, bands)
  const idx = order.indexOf(current)
  if (idx >= order.length - 1) return { nextGrade: null as Grade | null, marksNeeded: 0 }
  const next = order[idx + 1]
  const nextBand = bands.find(b => b.grade === next)
  if (!nextBand) return { nextGrade: null as Grade | null, marksNeeded: 0 }
  return { nextGrade: next as Grade, marksNeeded: Math.max(0, nextBand.min - studentTotal) }
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionCard({ num, title, sub, children, complete }: {
  num: number; title: string; sub: string; children: React.ReactNode; complete?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0',
          complete ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground border border-border')}>
          {num}
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Num({ label, hint, vtopHint, placeholder, value, onChange, max, step = 0.5, disabled }: {
  label: string; hint?: string; vtopHint?: string; placeholder: string
  value: string; onChange: (v: string) => void; max: number; step?: number; disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-xs font-medium">{label}</label>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        {vtopHint && (
          <p className="text-[10px] text-emerald-400/80 flex items-center gap-1 mt-0.5">
            <Sparkles className="size-2.5" /> {vtopHint}
          </p>
        )}
      </div>
      <input
        type="number" min={0} max={max} step={step}
        placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onWheel={e => (e.target as HTMLInputElement).blur()}
        disabled={disabled}
        className="w-full h-10 rounded-xl border border-border/60 bg-secondary/30 px-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-secondary transition-colors disabled:opacity-50"
      />
    </div>
  )
}

function ScaleHint({ raw, from, to }: { raw: string; from: number; to: number }) {
  if (!raw) return null
  return <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">→ {((Number(raw) / from) * to).toFixed(2)} / {to}</p>
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
        on
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground',
      )}
    >
      <div className={cn('w-7 h-4 rounded-full relative transition-colors', on ? 'bg-primary' : 'bg-border')}>
        <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', on ? 'left-3.5' : 'left-0.5')} />
      </div>
      {label}
    </button>
  )
}

function BellTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.[0]) return null
  const { x, totalCurve } = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold">{x.toFixed(0)} marks</p>
      <p className="text-muted-foreground">density: {(totalCurve * 100).toFixed(3)}%</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function GradePredictor() {
  const {
    cat1, cat2, internals, cat1Avg, cat2Avg, internalAvg,
    maxInt, minInt, classSize,
    extSlider, fatAvg, fatExamDone,
    labInternalTotal, labFat,
    selectedGradeCode, setSelectedGradeCode,
    setGradeField, setExtSlider, setFatExamDone, resetGrade,
    vtopData, vtopConnected,
  } = useStore()

  // Mode: manual toggle when no VTOP, auto-detected from selected course otherwise
  const [manualMode, setManualMode] = useState<'THEORY' | 'LAB'>('THEORY')

  const allCourses = useMemo(() => {
    if (!vtopData) return []
    // Prefer the semester whose marks we actually fetched (may differ from semesters[0])
    const semId = vtopData.currentSemMarksId ?? vtopData.semesters[0]?.id
    const timetableCourses = semId ? (vtopData.coursesBySem[semId] ?? []) : []
    const timetableCodes = new Set(timetableCourses.map(c => c.code))
    const marksOnly = vtopData.currentSemMarks
      .filter(m => !timetableCodes.has(m.courseCode))
      .map(m => ({
        code: m.courseCode,
        name: m.courseName || m.courseCode,
        type: 'THEORY' as const,
        credits: 0,
        faculty: '',
      }))
    return [...timetableCourses, ...marksOnly]
  }, [vtopData])

  const selectedCourse = allCourses.find(c => c.code === selectedGradeCode)
  const isLabMode = selectedCourse ? selectedCourse.type === 'LAB' : manualMode === 'LAB'
  const hasVtopMarks = vtopConnected && vtopData && vtopData.currentSemMarks.length > 0

  // Auto-fill marks when a course is selected
  useEffect(() => {
    if (!selectedGradeCode || !vtopData) return
    const marks = vtopData.currentSemMarks.find(m => m.courseCode === selectedGradeCode)
    if (!marks) return

    const isCourse = selectedCourse?.type === 'LAB'
    if (isCourse) {
      if (marks.labInternal !== undefined && marks.labInternal > 0) {
        setGradeField('labInternalTotal', String(Math.round(marks.labInternal)))
      }
      if (marks.fat !== undefined) {
        setGradeField('labFat', String(marks.fat))
      }
    } else {
      if (marks.cat1 !== undefined) setGradeField('cat1', String(marks.cat1))
      if (marks.cat2 !== undefined) setGradeField('cat2', String(marks.cat2))
      if (marks.internals !== undefined) setGradeField('internals', String(marks.internals))
      if (marks.fat !== undefined) {
        setExtSlider(marks.fat)
        setFatExamDone(true)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGradeCode, vtopData])

  // ── Theory math ───────────────────────────────────────────────────────────
  const cat1s  = cat1      !== '' ? (Number(cat1) / 50) * 15 : null
  const cat2s  = cat2      !== '' ? (Number(cat2) / 50) * 15 : null
  const ints   = internals !== '' ? Number(internals) : null
  const intTotal = cat1s !== null && cat2s !== null && ints !== null ? cat1s + cat2s + ints : null
  const fatContrib   = (extSlider / 100) * 40
  const studentTotal = intTotal !== null ? Math.max(0, Math.min(100, Math.round(intTotal + fatContrib))) : null

  const cat1AvgS  = cat1Avg     !== '' ? (Number(cat1Avg) / 50) * 15 : null
  const cat2AvgS  = cat2Avg     !== '' ? (Number(cat2Avg) / 50) * 15 : null
  const intAvgN   = internalAvg !== '' ? Number(internalAvg) : null
  const classIntMean = cat1AvgS !== null && cat2AvgS !== null && intAvgN !== null
    ? cat1AvgS + cat2AvgS + intAvgN : null

  // FAT average: when exam done use entered value; otherwise estimate from class internals.
  // Estimation: FAT class mean ≈ internal class mean × (40/60) × 0.88
  // (slight regression to mean — finals are typically harder than internals)
  const fatAvgContrib = fatExamDone && fatAvg !== ''
    ? (Number(fatAvg) / 100) * 40
    : classIntMean !== null
      ? classIntMean * (40 / 60) * 0.88
      : null

  const classTotalMean = classIntMean !== null && fatAvgContrib !== null
    ? classIntMean + fatAvgContrib : null

  const n = classSize !== '' ? Math.max(2, Number(classSize)) : 65
  const d2val = getD2(n)

  const sigma = useMemo(() => {
    if (classTotalMean === null) return null
    if (maxInt !== '' && minInt !== '') {
      return estimateSigma(Number(maxInt), Number(minInt), n)
    }
    return fallbackSigma(classTotalMean)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classTotalMean, maxInt, minInt, n])

  const bands = useMemo(() =>
    classTotalMean !== null && sigma !== null ? computeGradeBands(classTotalMean, sigma) : null,
  [classTotalMean, sigma])

  const predictedGrade   = bands && studentTotal !== null ? gradeForMark(studentTotal, bands) : null
  const classPercentile  = classTotalMean !== null && sigma !== null && studentTotal !== null
    ? percentile(studentTotal, classTotalMean, sigma) : null
  const nextInfo         = bands && studentTotal !== null ? marksForNextGrade(studentTotal, bands) : null
  const extForNextGrade  = nextInfo?.marksNeeded ? Math.ceil((nextInfo.marksNeeded / 40) * 100) : null

  const chartData = useMemo((): ChartPoint[] => {
    if (!classTotalMean || !sigma || !bands) return []
    return generateCurvePoints(classTotalMean, sigma).map(pt => {
      const row: ChartPoint = { x: Math.round(pt.x * 10) / 10, totalCurve: pt.y }
      for (const b of bands) row[b.grade] = (pt.x >= b.min && pt.x <= b.max + 0.5) ? pt.y : undefined
      return row
    })
  }, [classTotalMean, sigma, bands])

  // ── Lab math ──────────────────────────────────────────────────────────────
  const labInt       = labInternalTotal !== '' ? Number(labInternalTotal) : null
  const labFatScaled = labFat !== '' ? (Number(labFat) / 100) * 40 : null
  const labTotal     = labInt !== null && labFatScaled !== null
    ? Math.round(Math.max(0, Math.min(100, labInt + labFatScaled)))
    : labInt !== null
      ? Math.round(Math.max(0, Math.min(100, labInt + fatContrib)))  // use slider when fat not entered
      : null
  const labPredictedGrade = labTotal !== null ? labGradeForTotal(labTotal) : null
  const labFatActual = labFat !== '' ? Number(labFat) : extSlider

  const isStep1Done  = intTotal !== null
  const isStep2Done  = classTotalMean !== null
  const hasResults   = isStep1Done && isStep2Done && studentTotal !== null && bands !== null

  return (
    <div className="space-y-4">

      {/* Under construction banner */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-yellow-800/50 bg-yellow-950/30 px-4 py-3 text-xs text-yellow-400">
        <AlertTriangle className="size-3.5 shrink-0" />
        <span className="font-medium">Under construction</span>
        <span className="text-yellow-400/70">— grade predictor is experimental and may not reflect actual VIT grading.</span>
      </div>

      {/* Course selector (VTOP connected) */}
      {vtopConnected && vtopData && allCourses.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
            <p className="text-sm font-semibold">Select Course</p>
            <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
              VTOP synced
            </span>
          </div>
          <div className="p-3">
            <select
              value={selectedGradeCode ?? ''}
              onChange={e => { resetGrade(); setSelectedGradeCode(e.target.value || null) }}
              className="w-full h-10 appearance-none rounded-xl border border-border/60 bg-secondary/30 px-3 pr-8 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
            >
              <option value="">— select a course —</option>
              {allCourses.filter(c => c.type === 'THEORY').length > 0 && (
                <optgroup label="Theory">
                  {allCourses.filter(c => c.type === 'THEORY').map(c => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </optgroup>
              )}
              {allCourses.filter(c => c.type === 'LAB').length > 0 && (
                <optgroup label="Lab">
                  {allCourses.filter(c => c.type === 'LAB').map(c => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {hasVtopMarks && selectedGradeCode && (
              <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3 text-emerald-400" /> Your marks auto-filled from VTOP — edit if needed
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mode toggle — always visible; selecting a tab clears course selection */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setManualMode('THEORY')
            if (selectedGradeCode) setSelectedGradeCode(null)
            resetGrade()
          }}
          className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
            !isLabMode
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground')}
        >
          <BookOpen className="size-3.5" /> Theory
        </button>
        <button
          onClick={() => {
            setManualMode('LAB')
            if (selectedGradeCode) setSelectedGradeCode(null)
            resetGrade()
          }}
          className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
            isLabMode
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground')}
        >
          <FlaskConical className="size-3.5" /> Lab
        </button>
        <button onClick={resetGrade} className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw className="size-3" /> Reset
        </button>
      </div>

      {/* ════════════════════════ LAB MODE ════════════════════════════════════ */}
      {isLabMode && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[11px] text-primary/80">
            <FlaskConical className="size-3.5" />
            <span className="font-medium">Lab predictor</span>
            <span className="text-muted-foreground">— threshold grading, no bell curve</span>
          </div>

          {/* Lab internal marks */}
          <SectionCard num={1} title="Lab internal marks" sub="Sum of all lab sessions, practicals, record — out of 60" complete={labInt !== null}>
            <div className="space-y-3">
              <Num
                label="Total internal marks"
                hint="out of 60 — add all components"
                vtopHint={hasVtopMarks && selectedGradeCode ? 'Pre-filled from VTOP' : undefined}
                placeholder="e.g. 48"
                value={labInternalTotal}
                onChange={v => setGradeField('labInternalTotal', v)}
                max={60} step={0.5}
              />
              {labInt !== null && (
                <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Internal marks</span>
                    <span className="text-xl font-black tabular-nums">{labInt.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ 60</span></span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${(labInt / 60) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Lab FAT */}
          <SectionCard num={2} title="FAT exam (End Semester)" sub="Out of 100 — contributes 40 marks to your total" complete={labFat !== '' || extSlider > 0}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Toggle
                  on={fatExamDone}
                  onToggle={() => {
                    if (fatExamDone) setGradeField('labFat', '')
                    setFatExamDone(!fatExamDone)
                  }}
                  label="FAT exam completed"
                />
              </div>
              {fatExamDone ? (
                <Num
                  label="Your FAT marks"
                  hint="out of 100"
                  vtopHint={hasVtopMarks && selectedGradeCode ? 'From VTOP if published' : undefined}
                  placeholder="e.g. 72"
                  value={labFat}
                  onChange={v => setGradeField('labFat', v)}
                  max={100} step={0.5}
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Expected FAT marks (simulation)</span>
                    <span className="font-black text-xl tabular-nums text-primary">{extSlider}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={extSlider}
                    onChange={e => setExtSlider(Number(e.target.value))}
                    className="vit-slider w-full"
                    style={{ background: `linear-gradient(to right, oklch(0.62 0.19 238) 0%, oklch(0.62 0.19 238) ${extSlider}%, oklch(0.22 0 0) ${extSlider}%, oklch(0.22 0 0) 100%)` }}
                  />
                </div>
              )}
              {labInt !== null && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-secondary/30 border border-border/40 p-3">
                    <p className="text-[11px] text-muted-foreground">Internal</p>
                    <p className="text-lg font-bold tabular-nums">{labInt.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">/ 60</p>
                  </div>
                  <div className="rounded-xl bg-secondary/30 border border-border/40 p-3">
                    <p className="text-[11px] text-muted-foreground">FAT</p>
                    <p className="text-lg font-bold tabular-nums">{((labFatActual / 100) * 40).toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">/ 40</p>
                  </div>
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                    <p className="text-[11px] text-muted-foreground">Total</p>
                    <p className="text-lg font-black tabular-nums text-primary">{labTotal ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground">/ 100</p>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Lab result */}
          {labTotal !== null && labPredictedGrade && (
            <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: GRADE_CONFIG[labPredictedGrade].hex + '55' }}>
              <div className="h-1" style={{ background: GRADE_CONFIG[labPredictedGrade].hex }} />
              <div className="p-5 flex items-center gap-6">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Predicted grade</p>
                  <p className={cn('text-7xl font-black', GRADE_CONFIG[labPredictedGrade].color)}>{labPredictedGrade}</p>
                  <p className="text-sm text-muted-foreground mt-1">{GRADE_CONFIG[labPredictedGrade].label} · total {labTotal} / 100</p>
                </div>
                <div className="flex-1 space-y-1">
                  {LAB_THRESHOLDS.map(t => {
                    const isYou = labPredictedGrade === t.grade
                    const cfg = GRADE_CONFIG[t.grade]
                    return (
                      <div key={t.grade} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-xs', isYou ? `${cfg.bg} ${cfg.border} border` : 'bg-secondary/10')}>
                        <span className={cn('font-black w-5 text-center', cfg.color)}>{t.grade}</span>
                        <span className="font-mono tabular-nums text-foreground">{t.label}</span>
                        {isYou && <span className={cn('ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>you</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ════════════════════════ THEORY MODE ════════════════════════════════ */}
      {!isLabMode && (
        <div className="space-y-4">

          {/* Step 1: Your internal marks */}
          <SectionCard num={1} title="Your internal marks" sub="CAT 1 & 2 out of 50, scaled to 15 each · Internals out of 30" complete={isStep1Done}>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Num label="CAT 1" hint="out of 50"
                    vtopHint={hasVtopMarks && selectedGradeCode ? 'VTOP' : undefined}
                    placeholder="38" value={cat1} onChange={v => setGradeField('cat1', v)} max={50} />
                  <ScaleHint raw={cat1} from={50} to={15} />
                </div>
                <div>
                  <Num label="CAT 2" hint="out of 50"
                    vtopHint={hasVtopMarks && selectedGradeCode ? 'VTOP' : undefined}
                    placeholder="42" value={cat2} onChange={v => setGradeField('cat2', v)} max={50} />
                  <ScaleHint raw={cat2} from={50} to={15} />
                </div>
                <Num label="Internals" hint="out of 30"
                  vtopHint={hasVtopMarks && selectedGradeCode ? 'VTOP' : undefined}
                  placeholder="25" value={internals} onChange={v => setGradeField('internals', v)} max={30} />
              </div>
              {intTotal !== null && (
                <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Your internal marks</span>
                    <span className="text-xl font-black tabular-nums">{intTotal.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">/ 60</span></span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${(intTotal / 60) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Step 2: FAT exam */}
          <SectionCard num={2} title="FAT exam (End Semester)" sub="Out of 100 — contributes 40 marks · 15+15+30+40 = 100" complete={intTotal !== null}>
            <div className="space-y-4">
              <Toggle
                on={fatExamDone}
                onToggle={() => {
                  if (fatExamDone) setExtSlider(60)
                  setFatExamDone(!fatExamDone)
                }}
                label="FAT exam completed"
              />

              {fatExamDone ? (
                <Num
                  label="Your FAT marks"
                  hint="out of 100"
                  vtopHint={hasVtopMarks && selectedGradeCode ? 'From VTOP if published' : undefined}
                  placeholder="e.g. 68"
                  value={String(extSlider)}
                  onChange={v => setExtSlider(Number(v))}
                  max={100} step={0.5}
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Expected FAT marks (simulation)</span>
                    <span className="font-black text-xl tabular-nums text-primary">{extSlider}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={extSlider}
                    onChange={e => setExtSlider(Number(e.target.value))}
                    className="vit-slider w-full"
                    style={{ background: `linear-gradient(to right, oklch(0.62 0.19 238) 0%, oklch(0.62 0.19 238) ${extSlider}%, oklch(0.22 0 0) ${extSlider}%, oklch(0.22 0 0) 100%)` }}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                  </div>
                </div>
              )}

              {intTotal !== null && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-secondary/30 border border-border/40 p-3">
                    <p className="text-[11px] text-muted-foreground">Internal</p>
                    <p className="text-lg font-bold tabular-nums">{intTotal.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">/ 60</p>
                  </div>
                  <div className="rounded-xl bg-secondary/30 border border-border/40 p-3">
                    <p className="text-[11px] text-muted-foreground">FAT</p>
                    <p className="text-lg font-bold tabular-nums">{fatContrib.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">/ 40</p>
                  </div>
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                    <p className="text-[11px] text-muted-foreground">Total</p>
                    <p className="text-lg font-black tabular-nums text-primary">{studentTotal}</p>
                    <p className="text-[10px] text-muted-foreground">/ 100</p>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Step 3: Class statistics */}
          <SectionCard num={3} title="Class statistics" sub="Used to estimate the grade curve — approximate values are fine" complete={isStep2Done}>
            <div className="space-y-4">

              {/* Class size — affects d₂ and therefore σ */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Num label="Class size" hint={`d₂ = ${d2val.toFixed(3)} (affects σ)`}
                    placeholder="65" value={classSize}
                    onChange={v => setGradeField('classSize', v)} max={300} step={1} />
                </div>
                <div className="text-[11px] text-muted-foreground text-center pt-5 shrink-0">
                  <p>default 65</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Num label="CAT 1 avg" hint="out of 50" placeholder="32"
                    value={cat1Avg} onChange={v => setGradeField('cat1Avg', v)} max={50} />
                  <ScaleHint raw={cat1Avg} from={50} to={15} />
                </div>
                <div>
                  <Num label="CAT 2 avg" hint="out of 50" placeholder="35"
                    value={cat2Avg} onChange={v => setGradeField('cat2Avg', v)} max={50} />
                  <ScaleHint raw={cat2Avg} from={50} to={15} />
                </div>
                <Num label="Internals avg" hint="out of 30" placeholder="22"
                  value={internalAvg} onChange={v => setGradeField('internalAvg', v)} max={30} />
              </div>

              {/* FAT average or estimation note */}
              {fatExamDone ? (
                <Num label="Class FAT average" hint="out of 100 — from faculty / classmates"
                  placeholder="e.g. 62"
                  value={fatAvg} onChange={v => setGradeField('fatAvg', v)} max={100} step={0.5} />
              ) : (
                classIntMean !== null && (
                  <div className="flex items-start gap-2 rounded-xl bg-secondary/30 border border-border/40 px-3 py-2.5 text-[11px] text-muted-foreground">
                    <Info className="size-3.5 mt-0.5 shrink-0 text-primary/70" />
                    <span>
                      FAT avg auto-estimated at <strong className="text-foreground">{((classIntMean * (40 / 60) * 0.88)).toFixed(1)} / 40</strong> from
                      class internals. Toggle &quot;FAT completed&quot; above to enter the actual average.
                    </span>
                  </div>
                )
              )}

              {classTotalMean !== null && (
                <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Estimated class total mean</span>
                    <span className="text-xl font-black tabular-nums">{classTotalMean.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ 100</span></span>
                  </div>
                </div>
              )}

              {/* Optional range for better σ */}
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground list-none mt-1">
                  <ChevronUp className="size-3.5 rotate-180 transition-transform group-open:rotate-0" />
                  Score range (optional — improves σ estimate)
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Num label="Highest internal total" hint="out of 60" placeholder="58"
                    value={maxInt} onChange={v => setGradeField('maxInt', v)} max={60} />
                  <Num label="Lowest internal total"  hint="out of 60" placeholder="25"
                    value={minInt} onChange={v => setGradeField('minInt', v)} max={60} />
                </div>
                {sigma !== null && classTotalMean !== null && (
                  <div className="mt-2 flex items-start gap-2 rounded-xl bg-secondary/30 border border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
                    <Info className="size-3.5 mt-0.5 shrink-0 text-primary/70" />
                    <span>
                      {maxInt && minInt
                        ? `σ = ${sigma.toFixed(2)} — from internal range ÷ d₂(${Math.round(n)}) = ${d2val.toFixed(3)} × ρ-scale ${Math.sqrt(1 + (40 / 60) ** 2 + 2 * 0.7 * (40 / 60)).toFixed(3)}`
                        : `σ = ${sigma.toFixed(2)} — fallback: 18% of class mean (enter score range above for better accuracy)`}
                    </span>
                  </div>
                )}
              </details>
            </div>
          </SectionCard>

          {/* Results */}
          {hasResults && bands && studentTotal !== null && predictedGrade && classTotalMean !== null && sigma !== null ? (
            <div className="space-y-4">
              {/* Grade result card */}
              <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: GRADE_CONFIG[predictedGrade].hex + '55' }}>
                <div className="h-1" style={{ background: GRADE_CONFIG[predictedGrade].hex }} />
                <div className="p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Predicted grade</p>
                      <p className={cn('text-7xl font-black', GRADE_CONFIG[predictedGrade].color)}>{predictedGrade}</p>
                      <p className="text-sm text-muted-foreground mt-1">{GRADE_CONFIG[predictedGrade].label}</p>
                    </div>
                    <div className="space-y-2 text-right text-xs">
                      {classPercentile !== null && (
                        <div className="rounded-xl bg-secondary/40 border border-border/40 px-3 py-2">
                          <p className="text-muted-foreground">Class percentile</p>
                          <p className="text-xl font-black">{classPercentile}<span className="text-xs font-normal text-muted-foreground">th</span></p>
                        </div>
                      )}
                      <div className="rounded-xl bg-secondary/40 border border-border/40 px-3 py-2">
                        <p className="text-muted-foreground">Your total / class mean</p>
                        <p className="font-semibold font-mono">{studentTotal} / {classTotalMean.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                  {nextInfo?.nextGrade && nextInfo.marksNeeded > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/60">
                      <p className="text-xs text-muted-foreground">
                        You need{' '}
                        <span className="font-semibold text-foreground">{nextInfo.marksNeeded} more marks</span>{' '}
                        for grade{' '}
                        <span className={cn('font-black', GRADE_CONFIG[nextInfo.nextGrade].color)}>{nextInfo.nextGrade}</span>
                        {extForNextGrade !== null && extForNextGrade <= 100 && (
                          <> — score <span className="font-semibold text-foreground">{extForNextGrade}+</span> in FAT</>
                        )}
                      </p>
                    </div>
                  )}
                  {!nextInfo?.nextGrade && (
                    <p className="mt-3 text-xs text-emerald-400 font-medium">You&apos;re at the highest grade — excellent work.</p>
                  )}
                </div>
              </div>

              {/* Bell curve */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border/60">
                  <p className="text-sm font-semibold">Grade Distribution</p>
                  <p className="text-[11px] text-muted-foreground">
                    Skew-normal (α=−2.5) · μ={classTotalMean.toFixed(1)} · σ={sigma.toFixed(1)} · n={Math.round(n)} · your score marked ↓
                  </p>
                </div>
                <div className="px-2 py-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                      <XAxis dataKey="x" type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#555' }} tickLine={false} axisLine={false} interval={9} />
                      <YAxis hide />
                      <Tooltip content={<BellTooltip />} />
                      {(['F', 'E', 'D', 'C', 'B', 'A', 'S'] as Grade[]).map(g => (
                        <Area key={g} type="monotone" dataKey={g} fill={GRADE_CONFIG[g].fillHex} stroke={GRADE_CONFIG[g].hex} strokeWidth={0.5} isAnimationActive={false} connectNulls={false} />
                      ))}
                      <Area type="monotone" dataKey="totalCurve" fill="transparent" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} isAnimationActive={false} connectNulls />
                      <ReferenceLine x={Math.round(classTotalMean)} stroke="#555" strokeDasharray="4 3" strokeWidth={1} />
                      {studentTotal !== null && (
                        <ReferenceLine x={studentTotal} stroke="#fff" strokeWidth={2} label={{ value: `${studentTotal}`, position: 'top', fontSize: 10, fill: '#fff' }} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 px-4 mt-1">
                    {(Object.entries(GRADE_CONFIG) as [Grade, typeof GRADE_CONFIG[Grade]][]).map(([g, cfg]) => (
                      <div key={g} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: cfg.hex }} />
                        <span className={cn('text-[10px] font-bold', cfg.color)}>{g}</span>
                        <span className="text-[10px] text-muted-foreground">{bands.find(b => b.grade === g)?.formula}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grade boundaries */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border/60">
                  <p className="text-sm font-semibold">Grade Boundaries</p>
                  <p className="text-[11px] text-muted-foreground">μ={classTotalMean.toFixed(1)}, σ={sigma.toFixed(2)}, n={Math.round(n)} — your score: {studentTotal}</p>
                </div>
                <div className="p-3 space-y-1">
                  {bands.map(b => {
                    const isYou = studentTotal !== null && studentTotal >= b.min && studentTotal <= b.max
                    const cfg = GRADE_CONFIG[b.grade]
                    return (
                      <div key={b.grade} className={cn('grid grid-cols-[28px_1fr_1fr_auto] gap-2 items-center rounded-xl px-3 py-2.5', isYou ? `${cfg.bg} ${cfg.border} border` : 'bg-secondary/10')}>
                        <span className={cn('text-base font-black text-center', cfg.color)}>{b.grade}</span>
                        <span className="font-mono text-xs tabular-nums text-foreground">{b.formula}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {b.grade === 'S' ? 'μ+1.5σ, min 90%' : b.grade === 'A' ? 'μ+0.5σ to μ+1.5σ'
                            : b.grade === 'B' ? 'μ−0.5σ to μ+0.5σ' : b.grade === 'C' ? 'μ−σ to μ−0.5σ'
                            : b.grade === 'D' ? 'μ−1.5σ to μ−σ' : b.grade === 'E' ? 'μ−2σ to μ−1.5σ' : 'below μ−2σ'}
                        </span>
                        {isYou && <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>you</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-2xl border border-yellow-900/40 bg-yellow-950/20 px-4 py-3 text-xs text-yellow-400/80">
                <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                <span>Approximate — VIT computes actual grade boundaries from full class results after the FAT exam.</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/40 py-10 text-center space-y-1.5">
              <p className="text-sm text-muted-foreground">Complete steps 1 and 3 to see predictions</p>
              <button onClick={resetGrade} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto mt-3">
                <RotateCcw className="size-3" /> Reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
