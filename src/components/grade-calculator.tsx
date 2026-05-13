'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BellCurve } from './bell-curve'
import {
  computeGradeBands, gradeForMark, estimateSigma, fallbackSigma,
  GRADE_META, type Grade, type GradeBand,
} from '@/lib/distribution'
import { cn } from '@/lib/utils'
import { AlertCircle, Info } from 'lucide-react'

// ─── tiny field components ────────────────────────────────────────────────

function Field({
  label, hint, placeholder, value, onChange, max, step = 1,
}: {
  label: string; hint?: string; placeholder: string
  value: string; onChange: (v: string) => void; max: number; step?: number
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Input
        type="number" min={0} max={max} step={step}
        placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

function Scaled({ raw, from, to }: { raw: string; from: number; to: number }) {
  if (!raw) return <span className="text-xs text-transparent">—</span>
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      → {((Number(raw) / from) * to).toFixed(2)} / {to}
    </span>
  )
}

function SectionHeading({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
        {n}
      </span>
      <div>
        <p className="font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

function InternalBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">/ {max}</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────

export function GradeCalculator() {
  const [cat1, setCat1]               = useState('')
  const [cat2, setCat2]               = useState('')
  const [internals, setInternals]     = useState('')
  const [cat1Avg, setCat1Avg]         = useState('')
  const [cat2Avg, setCat2Avg]         = useState('')
  const [internalAvg, setInternalAvg] = useState('')
  const [maxInt, setMaxInt]           = useState('')
  const [minInt, setMinInt]           = useState('')
  const [extMin, setExtMin]           = useState('')
  const [extMax, setExtMax]           = useState('')

  // ── derived values ────────────────────────────────────────────────────

  const sc = (v: string, from: number, to: number) =>
    v !== '' ? (Number(v) / from) * to : null

  const cat1s = sc(cat1, 50, 15)
  const cat2s = sc(cat2, 50, 15)
  const intTotal =
    cat1s !== null && cat2s !== null && internals !== ''
      ? cat1s + cat2s + Number(internals)
      : null

  const cat1AvgS = sc(cat1Avg, 50, 15)
  const cat2AvgS = sc(cat2Avg, 50, 15)
  const classIntMean =
    cat1AvgS !== null && cat2AvgS !== null && internalAvg !== ''
      ? cat1AvgS + cat2AvgS + Number(internalAvg)
      : null

  // Class total mean: assume same performance proportion in external exam
  // class_ext_mean = (class_int_mean / 60) × 40  →  total = int_mean × (100/60)
  const classTotalMean = classIntMean !== null ? classIntMean * (100 / 60) : null

  // σ from range (n=60) + correlation correction; fallback to 18% CV
  const hasRange = maxInt !== '' && minInt !== ''
  const sigma = useMemo(() => {
    if (classTotalMean === null) return null
    if (hasRange) return estimateSigma(Number(maxInt), Number(minInt))
    return fallbackSigma(classTotalMean)
  }, [classTotalMean, hasRange, maxInt, minInt])

  // Student's total range: internal + external (raw out of 100 → scaled to 40)
  const studentMin =
    intTotal !== null && extMin !== ''
      ? Math.max(0, Math.min(100, Math.round(intTotal + (Number(extMin) / 100) * 40)))
      : null
  const studentMax =
    intTotal !== null && extMax !== ''
      ? Math.max(0, Math.min(100, Math.round(intTotal + (Number(extMax) / 100) * 40)))
      : null

  const effMin = studentMin !== null && studentMax !== null ? Math.min(studentMin, studentMax) : studentMin
  const effMax = studentMin !== null && studentMax !== null ? Math.max(studentMin, studentMax) : studentMax

  const bands: GradeBand[] | null = useMemo(
    () => (classTotalMean !== null && sigma !== null ? computeGradeBands(classTotalMean, sigma) : null),
    [classTotalMean, sigma],
  )

  const minGrade: Grade | null = bands && effMin !== null ? gradeForMark(effMin, bands) : null
  const maxGrade: Grade | null = bands && effMax !== null ? gradeForMark(effMax, bands) : null

  const hasResults = bands !== null && effMin !== null && effMax !== null && classTotalMean !== null && sigma !== null

  return (
    <div className="space-y-4">

      {/* ── Step 1: Your marks ── */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <SectionHeading
            n={1}
            title="Your internal marks"
            sub="CAT scores are out of 50 and get scaled to 15 each"
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Field label="CAT 1" hint="out of 50" placeholder="e.g. 38" value={cat1} onChange={setCat1} max={50} />
              <Scaled raw={cat1} from={50} to={15} />
            </div>
            <div>
              <Field label="CAT 2" hint="out of 50" placeholder="e.g. 42" value={cat2} onChange={setCat2} max={50} />
              <Scaled raw={cat2} from={50} to={15} />
            </div>
            <Field label="Internals" hint="out of 30" placeholder="e.g. 25" value={internals} onChange={setInternals} max={30} />
          </div>
          {intTotal !== null && <InternalBar label="Your internal marks" value={intTotal} max={60} />}
        </CardContent>
      </Card>

      {/* ── Step 2: Class averages ── */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <SectionHeading
            n={2}
            title="Class averages"
            sub="Used to compute the class mean for relative grading — use approximate values if unsure"
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Field label="CAT 1 avg" hint="out of 50" placeholder="e.g. 32" value={cat1Avg} onChange={setCat1Avg} max={50} step={0.5} />
              <Scaled raw={cat1Avg} from={50} to={15} />
            </div>
            <div>
              <Field label="CAT 2 avg" hint="out of 50" placeholder="e.g. 35" value={cat2Avg} onChange={setCat2Avg} max={50} step={0.5} />
              <Scaled raw={cat2Avg} from={50} to={15} />
            </div>
            <Field label="Internal avg" hint="out of 30" placeholder="e.g. 22" value={internalAvg} onChange={setInternalAvg} max={30} step={0.5} />
          </div>
          {classIntMean !== null && (
            <div className="grid grid-cols-2 gap-3">
              <InternalBar label="Class internal mean" value={classIntMean} max={60} />
              {classTotalMean !== null && (
                <InternalBar label="Estimated class total mean" value={classTotalMean} max={100} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Step 3: Class spread ── */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <SectionHeading
            n={3}
            title="Class score range (optional but recommended)"
            sub="Highest and lowest internal marks seen in class — used to estimate the standard deviation for n=60 students"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Highest internal in class" hint="out of 60" placeholder="e.g. 57" value={maxInt} onChange={setMaxInt} max={60} step={0.5} />
            <Field label="Lowest internal in class" hint="out of 60" placeholder="e.g. 28" value={minInt} onChange={setMinInt} max={60} step={0.5} />
          </div>
          {sigma !== null && classTotalMean !== null && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 border px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="size-3.5 mt-0.5 shrink-0" />
              <span>
                {hasRange
                  ? <>σ (total) = {sigma.toFixed(2)} — estimated from internal range ÷ 4.64 (d₂ for n=60) × 1.54 (ρ=0.7 correlation correction)</>
                  : <>σ (total) = {sigma.toFixed(2)} — estimated as 18% of class mean (fallback; provide class range above for better accuracy)</>
                }
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Step 4: End sem ── */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <SectionHeading
            n={4}
            title="End semester exam"
            sub="Enter the range of marks you expect to score — the exam is out of 100 and gets scaled to 40"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minimum expected" hint="out of 100 (→ ×0.4 to get /40)" placeholder="e.g. 55" value={extMin} onChange={setExtMin} max={100} />
            <Field label="Maximum expected" hint="out of 100 (→ ×0.4 to get /40)" placeholder="e.g. 80" value={extMax} onChange={setExtMax} max={100} />
          </div>
          {extMin !== '' && extMax !== '' && intTotal !== null && (
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="rounded-lg bg-muted/50 border px-3 py-2">
                Worst case total: <span className="font-semibold text-foreground tabular-nums">{effMin}</span> / 100
                <span className="ml-1 text-muted-foreground/70">(int {intTotal.toFixed(1)} + ext {((Number(extMin)/100)*40).toFixed(1)})</span>
              </div>
              <div className="rounded-lg bg-muted/50 border px-3 py-2">
                Best case total: <span className="font-semibold text-foreground tabular-nums">{effMax}</span> / 100
                <span className="ml-1 text-muted-foreground/70">(int {intTotal.toFixed(1)} + ext {((Number(extMax)/100)*40).toFixed(1)})</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Results ── */}
      {hasResults && bands && classTotalMean !== null && sigma !== null && effMin !== null && effMax !== null ? (
        <div className="space-y-4">

          {/* Grade prediction */}
          <Card
            className="border-2 overflow-hidden"
            style={{ borderColor: minGrade ? GRADE_META[minGrade].stroke + '60' : undefined }}
          >
            <div
              className="h-1"
              style={{
                background: minGrade && maxGrade && minGrade !== maxGrade
                  ? `linear-gradient(to right, ${GRADE_META[minGrade].stroke}, ${GRADE_META[maxGrade].stroke})`
                  : minGrade ? GRADE_META[minGrade].stroke : undefined,
              }}
            />
            <CardContent className="py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Predicted grade</p>
                  <div className="flex items-center gap-3">
                    {minGrade && (
                      <span className={cn('text-6xl font-black', GRADE_META[minGrade].text)}>
                        {minGrade}
                      </span>
                    )}
                    {maxGrade && minGrade !== maxGrade && (
                      <>
                        <span className="text-xl text-muted-foreground">to</span>
                        <span className={cn('text-6xl font-black', GRADE_META[maxGrade].text)}>
                          {maxGrade}
                        </span>
                      </>
                    )}
                  </div>
                  {minGrade && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {minGrade === maxGrade
                        ? GRADE_META[minGrade].label
                        : `${GRADE_META[minGrade!].label} to ${maxGrade ? GRADE_META[maxGrade].label : ''}`}
                    </p>
                  )}
                </div>
                <div className="text-sm space-y-1 text-right">
                  <div className="text-muted-foreground">
                    Your total range:{' '}
                    <span className="font-semibold text-foreground">{effMin} – {effMax}</span> / 100
                  </div>
                  <div className="text-muted-foreground">
                    Class mean (estimated):{' '}
                    <span className="font-semibold text-foreground">{classTotalMean.toFixed(1)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    σ: <span className="font-semibold text-foreground">{sigma.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bell curve */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Grade Distribution Curve</CardTitle>
              <CardDescription className="text-xs">
                Skew-normal (α = −2.5, left tail) · your possible total score is the shaded vertical band
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BellCurve
                mean={classTotalMean}
                sigma={sigma}
                bands={bands}
                studentMin={effMin}
                studentMax={effMax}
              />
            </CardContent>
          </Card>

          {/* Grade boundaries */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Grade Boundaries</CardTitle>
              <CardDescription className="text-xs">
                μ = {classTotalMean.toFixed(1)} · σ = {sigma.toFixed(2)} · highlighted = within your possible range
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="grid grid-cols-[28px_1fr_1fr_80px] gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                <span></span><span>Mark range</span><span>Formula</span><span></span>
              </div>
              {bands.map(b => {
                const inRange = effMax >= b.min && effMin <= b.max && b.min <= b.max
                return (
                  <div
                    key={b.grade}
                    className={cn(
                      'grid grid-cols-[28px_1fr_1fr_80px] gap-2 items-center rounded-lg px-2 py-2.5 text-sm',
                      inRange ? GRADE_META[b.grade].bg : 'bg-muted/20'
                    )}
                  >
                    <span className={cn('text-base font-black text-center', GRADE_META[b.grade].text)}>
                      {b.grade}
                    </span>
                    <span className="font-mono text-xs tabular-nums">{b.formula}</span>
                    <span className="text-xs text-muted-foreground">
                      {b.grade === 'S' && 'μ+1.5σ, min 90%'}
                      {b.grade === 'A' && 'μ+0.5σ to μ+1.5σ'}
                      {b.grade === 'B' && 'μ−0.5σ to μ+0.5σ'}
                      {b.grade === 'C' && 'μ−σ to μ−0.5σ'}
                      {b.grade === 'D' && 'μ−1.5σ to μ−σ'}
                      {b.grade === 'E' && 'μ−2σ to μ−1.5σ'}
                      {b.grade === 'F' && 'below μ−2σ'}
                    </span>
                    <div className="flex justify-end">
                      {inRange && (
                        <Badge variant="outline" className={cn('text-xs', GRADE_META[b.grade].text)}>
                          your range
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}

              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300 mt-3">
                <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                <span>
                  All values are <strong>estimates</strong>. VIT computes the actual mean and σ from full class results
                  after the end semester exam. Class mean assumes external performance proportional to internal.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Complete steps 1–4 to see your grade prediction
            </p>
            <p className="text-xs text-muted-foreground/60">
              Steps 3 (class range) and 4 (end sem) will unlock the full analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
