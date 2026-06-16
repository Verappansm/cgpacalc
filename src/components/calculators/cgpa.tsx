'use client'

import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'
import { RotateCcw, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useStore } from '@/store/calculator-store'
import { cn } from '@/lib/utils'

function AnimatedNum({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  useEffect(() => {
    if (!ref.current) return
    const from = prev.current; prev.current = value
    const c = animate(from, value, {
      duration: 0.5, ease: 'easeOut',
      onUpdate(v) { if (ref.current) ref.current.textContent = v.toFixed(decimals) },
    })
    return () => c.stop()
  }, [value, decimals])
  return <span ref={ref}>{value.toFixed(decimals)}</span>
}

function cgpaColor(v: number) {
  if (v >= 9) return 'text-emerald-400'
  if (v >= 8) return 'text-blue-400'
  if (v >= 7) return 'text-violet-400'
  if (v >= 6) return 'text-yellow-400'
  return 'text-red-400'
}

function feasibility(req: number): { label: string; color: string; bg: string } {
  if (req > 10)   return { label: 'Not achievable',   color: 'text-red-400',     bg: 'bg-red-950/40 border-red-900/60' }
  if (req <= 0)   return { label: 'Already achieved', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-900/60' }
  if (req >= 9.5) return { label: 'Very difficult',   color: 'text-orange-400',  bg: 'bg-orange-950/40 border-orange-900/60' }
  if (req >= 8.5) return { label: 'Challenging',      color: 'text-yellow-400',  bg: 'bg-yellow-950/40 border-yellow-900/60' }
  if (req >= 7)   return { label: 'Achievable',       color: 'text-blue-400',    bg: 'bg-blue-950/40 border-blue-900/60' }
  return { label: 'Safe target', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-900/60' }
}

function NumberInput({
  label, hint, vtopHint, placeholder, value, onChange, max = 10, step = 0.01,
}: {
  label: string; hint?: string; vtopHint?: string; placeholder: string
  value: string; onChange: (v: string) => void; max?: number; step?: number
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-xs font-medium text-foreground">{label}</label>
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
        className="w-full h-10 rounded-xl border border-border/60 bg-secondary/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-secondary transition-colors"
      />
    </div>
  )
}

export function CGPACalculator() {
  const {
    creditsDone, cgpaSoFar, creditsSem, gpaSem, targetCgpa,
    setCgpaField, resetCGPA,
    vtopData, vtopConnected, selectedSemId,
  } = useStore()

  // Auto-fill from VTOP data when available
  useEffect(() => {
    if (!vtopData) return
    if (vtopData.totalCredits > 0 && creditsDone === '') {
      setCgpaField('creditsDone', String(vtopData.totalCredits))
    }
    if (vtopData.cgpa > 0 && cgpaSoFar === '') {
      setCgpaField('cgpaSoFar', vtopData.cgpa.toFixed(2))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vtopData])

  // Auto-fill credits this semester when semester is selected
  useEffect(() => {
    if (!vtopData || !selectedSemId) return
    const courses = vtopData.coursesBySem[selectedSemId] ?? []
    const semCredits = courses.reduce((s, c) => s + c.credits, 0)
    if (semCredits > 0) setCgpaField('creditsSem', String(semCredits))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemId, vtopData])

  const cd = creditsDone !== '' ? Number(creditsDone) : null
  const cg = cgpaSoFar   !== '' ? Number(cgpaSoFar)   : null
  const cs = creditsSem  !== '' ? Number(creditsSem)  : null
  const gs = gpaSem      !== '' ? Number(gpaSem)      : null
  const tc = targetCgpa  !== '' ? Number(targetCgpa)  : null

  const hasCurrent = cd !== null && cg !== null && cs !== null && gs !== null && cd > 0 && cs > 0
  const finalCgpa  = hasCurrent ? (cd! * cg! + cs! * gs!) / (cd! + cs!) : null

  const hasAnticipated = cd !== null && cg !== null && cs !== null && tc !== null && cd > 0 && cs > 0
  const requiredGpa    = hasAnticipated ? (tc! * (cd! + cs!) - cd! * cg!) / cs! : null
  const f = requiredGpa !== null ? feasibility(requiredGpa) : null

  const isVtopFilled = vtopConnected && vtopData && vtopData.cgpa > 0

  return (
    <div className="space-y-5">

      {/* VTOP autofill banner */}
      {isVtopFilled && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-800/40 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-400">
          <Sparkles className="size-3.5 shrink-0" />
          <span>Credits done and CGPA auto-filled from <strong>VTOP grade history</strong>. Edit if needed.</span>
        </div>
      )}

      {/* ── Current CGPA ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
          <div>
            <p className="text-sm font-semibold">Current CGPA</p>
            <p className="text-xs text-muted-foreground">Updated after this semester</p>
          </div>
          <button onClick={resetCGPA} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Credits done so far *"
              hint="Exclude VITOL"
              vtopHint={isVtopFilled ? 'From VTOP grade history' : undefined}
              placeholder="e.g. 120"
              value={creditsDone}
              onChange={v => setCgpaField('creditsDone', v)}
              max={400} step={1}
            />
            <div>
              <NumberInput
                label="CGPA so far *"
                hint="→ check grade history"
                vtopHint={isVtopFilled ? 'From VTOP grade history' : undefined}
                placeholder="e.g. 8.50"
                value={cgpaSoFar}
                onChange={v => setCgpaField('cgpaSoFar', v)}
              />
              <Link
                href="/app?tab=analytics"
                className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-primary/50 hover:text-primary transition-colors"
              >
              </Link>
            </div>
            <NumberInput
              label="Credits this semester *"
              hint="Exclude VITOL"
              vtopHint={isVtopFilled && selectedSemId ? 'From selected semester' : undefined}
              placeholder="e.g. 24"
              value={creditsSem}
              onChange={v => setCgpaField('creditsSem', v)}
              max={50} step={1}
            />
            <NumberInput
              label="GPA this semester"
              hint="Use GPA tab"
              placeholder="e.g. 9.00"
              value={gpaSem}
              onChange={v => setCgpaField('gpaSem', v)}
            />
          </div>

          {finalCgpa !== null && cd !== null && cs !== null && cg !== null && gs !== null ? (
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Updated CGPA</p>
                  <p className={cn('text-5xl font-black tabular-nums mt-1', cgpaColor(finalCgpa))}>
                    <AnimatedNum value={finalCgpa} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">{cd + cs} total credits</p>
                </div>
                <div className="text-right text-xs text-muted-foreground space-y-1 pb-1">
                  <div className="font-mono text-[11px] bg-secondary rounded-lg px-2 py-1">
                    ({cd} × {cg} + {cs} × {gs.toFixed(2)}) ÷ {cd + cs}
                  </div>
                  <div className="font-mono text-[11px] bg-secondary rounded-lg px-2 py-1">
                    = {(cd * cg + cs * gs).toFixed(2)} ÷ {cd + cs}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/40 py-6 text-center text-xs text-muted-foreground">
              Fill all four fields to see your updated CGPA
            </div>
          )}
        </div>
      </div>

      {/* ── Target Calculator ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">Target Calculator</p>
            <p className="text-[10px] text-muted-foreground/60 text-right leading-relaxed">
              Fill the 3 required fields (*) above to get results
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Max achievable CGPA */}
          {cd !== null && cg !== null && cs !== null && cd > 0 && cs > 0 && (
            <div className="rounded-xl border border-border/50 bg-secondary/20 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Max achievable CGPA</p>
                <p className="text-[11px] text-muted-foreground/60">If you score 10.00 this semester</p>
              </div>
              <p className="text-2xl font-black tabular-nums text-foreground/80">
                {((cd * cg + cs * 10) / (cd + cs)).toFixed(2)}
              </p>
            </div>
          )}

          {(!creditsDone || !cgpaSoFar || !creditsSem) && (
            <div className="rounded-xl bg-secondary/30 border border-border/40 px-4 py-3 text-xs text-muted-foreground">
              Complete the Current CGPA section above first
            </div>
          )}

          <NumberInput
            label="Desired final CGPA"
            placeholder="e.g. 9.00"
            value={targetCgpa}
            onChange={v => setCgpaField('targetCgpa', v)}
          />

          {requiredGpa !== null && f && cd !== null && cs !== null && tc !== null && (
            <div className={cn('rounded-xl border p-4', f.bg)}>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Required GPA this semester</p>
                  {requiredGpa > 10 ? (
                    <p className={cn('text-4xl font-black mt-1', f.color)}>Not achievable</p>
                  ) : requiredGpa <= 0 ? (
                    <p className={cn('text-4xl font-black mt-1', f.color)}>Already achieved!</p>
                  ) : (
                    <p className={cn('text-5xl font-black tabular-nums mt-1', f.color)}>
                      <AnimatedNum value={requiredGpa} />
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    to reach CGPA {tc} after {cd + cs} credits
                  </p>
                </div>
                <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full border', f.color, f.bg)}>
                  {f.label}
                </span>
              </div>

              {requiredGpa > 0 && requiredGpa <= 10 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="h-1.5 rounded-full bg-black/20 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, requiredGpa * 10)}%`, backgroundColor: 'currentColor' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>0</span><span>5</span><span>10</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
