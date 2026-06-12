'use client'

import { useMemo, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { AlertTriangle, Info, RotateCcw, ChevronUp, ChevronDown, Sparkles } from 'lucide-react'
import { useStore } from '@/store/calculator-store'
import { GRADE_CONFIG, D2_N65, TOTAL_SIGMA_SCALE, type Grade } from '@/lib/constants'
import {
  computeGradeBands, gradeForMark, generateCurvePoints,
  fallbackSigma, type GradeBand,
} from '@/lib/distribution'
import { cn } from '@/lib/utils'

type ChartPoint = { x: number; totalCurve: number } & Partial<Record<Grade, number>>

function marksForNextGrade(studentTotal: number, bands: GradeBand[]) {
  const order: Grade[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S']
  const current = gradeForMark(studentTotal, bands)
  const idx = order.indexOf(current)
  if (idx >= order.length - 1) return { nextGrade: null, marksNeeded: 0 }
  const next = order[idx + 1]
  const nextBand = bands.find(b => b.grade === next)
  if (!nextBand) return { nextGrade: null, marksNeeded: 0 }
  return { nextGrade: next, marksNeeded: Math.max(0, nextBand.min - studentTotal) }
}

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

function Num({ label, hint, vtopHint, placeholder, value, onChange, max, step = 0.5 }: {
  label: string; hint?: string; vtopHint?: string; placeholder: string
  value: string; onChange: (v: string) => void; max: number; step?: number
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
        className="w-full h-10 rounded-xl border border-border/60 bg-secondary/30 px-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-secondary transition-colors"
      />
    </div>
  )
}

function ScaleHint({ raw, from, to }: { raw: string; from: number; to: number }) {
  if (!raw) return null
  return <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">→ {((Number(raw) / from) * to).toFixed(2)} / {to}</p>
}

function InternalBar({ label, val, max }: { label: string; val: number; max: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black tabular-nums">{val.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">/ {max}</span>
        </div>
      </div>
      <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-primary/70 transition-all duration-500" style={{ width: `${(val / max) * 100}%` }} />
      </div>
    </div>
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

export function GradePredictor() {
  const {
    cat1, cat2, internals, cat1Avg, cat2Avg, internalAvg,
    maxInt, minInt, classSize, extSlider,
    selectedGradeCode, setSelectedGradeCode,
    setGradeField, setExtSlider, resetGrade,
    vtopData, vtopConnected,
  } = useStore()

  // Theory-only courses from current semester (VTOP)
  const theoryCourses = useMemo(() => {
    if (!vtopData) return []
    // Use the most recent semester's courses
    const latestSemId = vtopData.semesters[0]?.id
    if (!latestSemId) return []
    return (vtopData.coursesBySem[latestSemId] ?? []).filter(c => c.type === 'THEORY')
  }, [vtopData])

  // Auto-fill marks when course is selected
  useEffect(() => {
    if (!selectedGradeCode || !vtopData) return
    const marks = vtopData.currentSemMarks.find(m => m.courseCode === selectedGradeCode)
    if (!marks) return
    if (marks.cat1 !== undefined) setGradeField('cat1', String(marks.cat1))
    if (marks.cat2 !== undefined) setGradeField('cat2', String(marks.cat2))
    if (marks.internals !== undefined) setGradeField('internals', String(marks.internals))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGradeCode, vtopData])

  const sc = (v: string, from: number, to: number) => v !== '' ? (Number(v) / from) * to : null
  const cat1s  = sc(cat1,  50, 15)
  const cat2s  = sc(cat2,  50, 15)
  const intTotal = cat1s !== null && cat2s !== null && internals !== ''
    ? cat1s + cat2s + Number(internals) : null

  const cat1AvgS = sc(cat1Avg, 50, 15)
  const cat2AvgS = sc(cat2Avg, 50, 15)
  const classIntMean = cat1AvgS !== null && cat2AvgS !== null && internalAvg !== ''
    ? cat1AvgS + cat2AvgS + Number(internalAvg) : null
  const classTotalMean = classIntMean !== null ? classIntMean * (100 / 60) : null

  const hasRange = maxInt !== '' && minInt !== ''
  const n = classSize !== '' ? Number(classSize) : 65
  const d2 = D2_N65

  const sigma = useMemo(() => {
    if (classTotalMean === null) return null
    if (hasRange) {
      const rangeInt = Math.max(0, Number(maxInt) - Number(minInt))
      return Math.max(1, (rangeInt / d2) * TOTAL_SIGMA_SCALE)
    }
    return fallbackSigma(classTotalMean)
  }, [classTotalMean, hasRange, maxInt, minInt, d2])

  const extContrib   = (extSlider / 100) * 40
  const studentTotal = intTotal !== null ? Math.max(0, Math.min(100, Math.round(intTotal + extContrib))) : null
  const bands        = useMemo(() => classTotalMean !== null && sigma !== null ? computeGradeBands(classTotalMean, sigma) : null, [classTotalMean, sigma])
  const predictedGrade = bands && studentTotal !== null ? gradeForMark(studentTotal, bands) : null
  const classPercentile = classTotalMean && sigma && studentTotal !== null ? percentile(studentTotal, classTotalMean, sigma) : null
  const nextInfo = bands && studentTotal !== null ? marksForNextGrade(studentTotal, bands) : null
  const extForNext = nextInfo?.marksNeeded ? Math.ceil((nextInfo.marksNeeded / 40) * 100) : null

  const chartData = useMemo((): ChartPoint[] => {
    if (!classTotalMean || !sigma || !bands) return []
    return generateCurvePoints(classTotalMean, sigma).map(pt => {
      const row: ChartPoint = { x: Math.round(pt.x * 10) / 10, totalCurve: pt.y }
      for (const b of bands) row[b.grade] = (pt.x >= b.min && pt.x <= b.max + 0.5) ? pt.y : undefined
      return row
    })
  }, [classTotalMean, sigma, bands])

  const isStep1Done = intTotal !== null
  const isStep2Done = classTotalMean !== null
  const hasResults = isStep1Done && isStep2Done && studentTotal !== null && bands !== null
  const hasVtopMarks = vtopConnected && vtopData && vtopData.currentSemMarks.length > 0

  return (
    <div className="space-y-4">

      {/* VTOP course selector */}
      {vtopConnected && vtopData && theoryCourses.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
            <p className="text-sm font-semibold">Select Course</p>
            <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
              VTOP synced
            </span>
          </div>
          <div className="p-3 relative">
            <select
              value={selectedGradeCode ?? ''}
              onChange={e => { setSelectedGradeCode(e.target.value || null); resetGrade() }}
              className="w-full h-10 appearance-none rounded-xl border border-border/60 bg-secondary/30 px-3 pr-8 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
            >
              <option value="">— select a theory course —</option>
              {theoryCourses.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
          {hasVtopMarks && selectedGradeCode && (
            <p className="px-4 pb-3 text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-emerald-400" />
              Your marks auto-filled from VTOP — edit if needed
            </p>
          )}
          {!hasVtopMarks && (
            <p className="px-4 pb-3 text-[11px] text-muted-foreground">
              Marks not yet published on VTOP — enter manually below
            </p>
          )}
        </div>
      )}

      {/* Step 1: Your marks */}
      <SectionCard num={1} title="Your internal marks" sub="CAT scores are out of 50 → scaled to 15 each" complete={isStep1Done}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Num label="CAT 1" hint="out of 50" vtopHint={hasVtopMarks && selectedGradeCode ? 'VTOP' : undefined} placeholder="38" value={cat1} onChange={v => setGradeField('cat1', v)} max={50} />
              <ScaleHint raw={cat1} from={50} to={15} />
            </div>
            <div>
              <Num label="CAT 2" hint="out of 50" vtopHint={hasVtopMarks && selectedGradeCode ? 'VTOP' : undefined} placeholder="42" value={cat2} onChange={v => setGradeField('cat2', v)} max={50} />
              <ScaleHint raw={cat2} from={50} to={15} />
            </div>
            <Num label="Internals" hint="out of 30" vtopHint={hasVtopMarks && selectedGradeCode ? 'VTOP' : undefined} placeholder="25" value={internals} onChange={v => setGradeField('internals', v)} max={30} />
          </div>
          {intTotal !== null && <InternalBar label="Your internal marks" val={intTotal} max={60} />}
        </div>
      </SectionCard>

      {/* Step 2: Class averages */}
      <SectionCard num={2} title="Class averages" sub="Used to estimate the class mean — approximate values are fine" complete={isStep2Done}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Num label="CAT 1 avg" hint="out of 50" placeholder="32" value={cat1Avg} onChange={v => setGradeField('cat1Avg', v)} max={50} />
              <ScaleHint raw={cat1Avg} from={50} to={15} />
            </div>
            <div>
              <Num label="CAT 2 avg" hint="out of 50" placeholder="35" value={cat2Avg} onChange={v => setGradeField('cat2Avg', v)} max={50} />
              <ScaleHint raw={cat2Avg} from={50} to={15} />
            </div>
            <Num label="Internal avg" hint="out of 30" placeholder="22" value={internalAvg} onChange={v => setGradeField('internalAvg', v)} max={30} />
          </div>
          {classIntMean !== null && (
            <div className="grid grid-cols-2 gap-3">
              <InternalBar label="Class internal mean" val={classIntMean} max={60} />
              {classTotalMean && <InternalBar label="Est. class total mean" val={classTotalMean} max={100} />}
            </div>
          )}
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground list-none mt-2">
              <ChevronUp className="size-3.5 rotate-180 transition-transform group-open:rotate-0" />
              Class score range (optional — improves σ accuracy)
            </summary>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Num label="Highest internal" hint="out of 60" placeholder="55" value={maxInt} onChange={v => setGradeField('maxInt', v)} max={60} />
              <Num label="Lowest internal"  hint="out of 60" placeholder="28" value={minInt} onChange={v => setGradeField('minInt', v)} max={60} />
              <Num label="Class size" hint="default 65" placeholder="65" value={classSize} onChange={v => setGradeField('classSize', v)} max={200} step={1} />
            </div>
            {sigma !== null && classTotalMean !== null && (
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-secondary/30 border border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
                <Info className="size-3.5 mt-0.5 shrink-0 text-primary/70" />
                <span>
                  {hasRange
                    ? `σ = ${sigma.toFixed(2)} — from internal range ÷ ${d2.toFixed(2)} (d₂, n≈${n}) × ${TOTAL_SIGMA_SCALE.toFixed(2)} (ρ=0.7 correlation)`
                    : `σ = ${sigma.toFixed(2)} — fallback: 18% of class mean (provide range above for better accuracy)`}
                </span>
              </div>
            )}
          </details>
        </div>
      </SectionCard>

      {/* Step 3: End-sem slider */}
      <SectionCard num={3} title="End semester exam" sub="Drag to simulate — exam is out of 100, contributes 40 marks" complete={intTotal !== null}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Expected marks (out of 100)</span>
            <span className="font-black text-xl tabular-nums text-primary">{extSlider}</span>
          </div>
          <div className="relative">
            <input
              type="range" min={0} max={100} step={1}
              value={extSlider}
              onChange={e => setExtSlider(Number(e.target.value))}
              className="vit-slider"
              style={{ background: `linear-gradient(to right, oklch(0.62 0.19 238) 0%, oklch(0.62 0.19 238) ${extSlider}%, oklch(0.22 0 0) ${extSlider}%, oklch(0.22 0 0) 100%)` }}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>
          {intTotal !== null && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-secondary/30 border border-border/40 p-3">
                <p className="text-[11px] text-muted-foreground">Internal</p>
                <p className="text-lg font-bold tabular-nums">{intTotal.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">/ 60</p>
              </div>
              <div className="rounded-xl bg-secondary/30 border border-border/40 p-3">
                <p className="text-[11px] text-muted-foreground">External</p>
                <p className="text-lg font-bold tabular-nums">{extContrib.toFixed(1)}</p>
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

      {/* Results */}
      {hasResults && bands && studentTotal !== null && predictedGrade && classTotalMean && sigma ? (
        <div className="space-y-4">
          {/* Grade result */}
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
                    <p className="text-muted-foreground">Your total / Class mean</p>
                    <p className="font-semibold font-mono">{studentTotal} / {classTotalMean.toFixed(1)}</p>
                  </div>
                </div>
              </div>
              {nextInfo?.nextGrade && nextInfo.marksNeeded > 0 && (
                <div className="mt-4 pt-4 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    You need{' '}
                    <span className="font-semibold text-foreground">{nextInfo.marksNeeded} more marks</span>{' '}
                    to reach{' '}
                    <span className={cn('font-black', GRADE_CONFIG[nextInfo.nextGrade].color)}>{nextInfo.nextGrade}</span>
                    {extForNext !== null && extForNext <= 100 && (
                      <> — score <span className="font-semibold text-foreground">{extForNext}+</span> in your end sem exam</>
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
                Skew-normal (α=−2.5) · class mean {classTotalMean.toFixed(1)} · σ={sigma.toFixed(1)} · your score marked ↓
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
              <p className="text-[11px] text-muted-foreground">μ={classTotalMean.toFixed(1)}, σ={sigma.toFixed(2)} — highlighted rows contain your score ({studentTotal})</p>
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
            <span>These predictions are approximate and based on statistical estimation. VIT computes actual grade boundaries from full class results after the end semester exam.</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/40 py-10 text-center space-y-1.5">
          <p className="text-sm text-muted-foreground">Complete steps 1 and 2, then adjust the slider to see predictions</p>
          <button onClick={resetGrade} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto mt-3">
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
      )}
    </div>
  )
}
