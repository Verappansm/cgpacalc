'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, animate } from 'framer-motion'
import { Plus, Trash2, RotateCcw, ChevronDown } from 'lucide-react'
import { useStore, type CourseRow } from '@/store/calculator-store'
import { GRADE_POINTS, GRADE_CONFIG, type Grade } from '@/lib/constants'
import { ProgressRing } from '@/components/shared/progress-ring'
import { cn } from '@/lib/utils'

const GRADES = Object.keys(GRADE_POINTS) as Grade[]
const CREDIT_OPTIONS = ['1', '1.5', '2', '3', '4', '5']

function AnimatedGPA({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  useEffect(() => {
    if (!ref.current) return
    const from = prev.current
    prev.current = value
    const ctrl = animate(from, value, {
      duration: 0.6, ease: 'easeOut',
      onUpdate(v) { if (ref.current) ref.current.textContent = v.toFixed(2) },
    })
    return () => ctrl.stop()
  }, [value])
  return <span ref={ref}>{value.toFixed(2)}</span>
}

function gpaHex(gpa: number) {
  if (gpa >= 9) return '#34d399'
  if (gpa >= 8) return '#60a5fa'
  if (gpa >= 7) return '#a78bfa'
  if (gpa >= 6) return '#facc15'
  return '#f87171'
}
function gpaLabel(gpa: number) {
  if (gpa >= 9.5) return "You're insane — too good"
  if (gpa >= 9.2) return 'Excellent'
  if (gpa >= 9.0) return 'Very good'
  if (gpa >= 8.9) return 'Almost there, you got this'
  if (gpa >= 8.5) return 'Good'
  if (gpa >= 8.4) return 'Keep the good work going'
  if (gpa >= 8.0) return 'Building momentum'
  if (gpa >= 7.5) return "You've got this — keep pushing"
  if (gpa >= 7.0) return 'Needs work'
  if (gpa >= 6.5) return "One bad sem won't define you"
  if (gpa >= 6.0) return 'Work harder'
  if (gpa >= 5.0) return 'Reset yourself — time will change'
  return 'Reset yourself — time will change'
}

export function GPACalculator() {
  const {
    rows, addRow, removeRow, updateRow, setRows, resetGPA,
    selectedSemId, setSelectedSemId,
    vtopData, vtopConnected,
  } = useStore()

  // When selected semester changes, populate rows from VTOP data
  useEffect(() => {
    if (!vtopData || !selectedSemId) return
    const courses = vtopData.coursesBySem[selectedSemId] ?? []
    if (!courses.length) {
      setRows(Array.from({ length: 7 }, () => ({
        id: `empty-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        code: '', name: '', credits: '', grade: 'S' as const, type: '' as const,
      })))
      return
    }
    const histEntry = vtopData.gradeHistory.find(h => h.semId === selectedSemId)
    const newRows: CourseRow[] = courses.map((c, i) => {
      const gradeInfo = histEntry?.courses.find(hc => hc.code === c.code)
      return {
        id: `vtop-${c.code}-${i}`,
        code: c.code,
        name: c.name,
        credits: String(c.credits),
        grade: gradeInfo?.grade ?? 'S',
        type: c.type,
      }
    })
    if (newRows.length > 0) setRows(newRows)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemId, vtopData])

  // Only count rows that have a credit value selected
  const valid       = rows.filter(r => r.credits !== '' && Number(r.credits) > 0)
  const totalCredits = valid.reduce((s, r) => s + Number(r.credits), 0)
  const weighted     = valid.reduce((s, r) => s + Number(r.credits) * (GRADE_POINTS[r.grade as Grade] ?? 0), 0)
  const gpa          = totalCredits > 0 ? weighted / totalCredits : null

  const semesters = vtopData?.semesters ?? []
  const isPastSem = vtopData && selectedSemId
    ? !!vtopData.gradeHistory.find(h => h.semId === selectedSemId)
    : false

  // Determines whether to show the full VTOP layout (name + number credits + grade)
  // or the compact manual layout (credit dropdown + grade only)
  const isVtopMode = vtopConnected && vtopData

  return (
    <div className="space-y-4">

      {/* Semester selector (VTOP connected only) */}
      {isVtopMode && semesters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <p className="text-sm font-semibold">Semester</p>
            <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
              VTOP synced
            </span>
          </div>
          <div className="p-3 relative">
            <select
              value={selectedSemId ?? ''}
              onChange={e => setSelectedSemId(e.target.value || null)}
              className="w-full h-10 appearance-none rounded-xl border border-border/60 bg-secondary/30 px-3 pr-8 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
            >
              <option value="">— pick a semester —</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
          {isPastSem && (
            <p className="px-4 pb-3 text-[11px] text-muted-foreground">
              Grades pre-filled from VTOP grade history — edit if needed.
            </p>
          )}
        </motion.div>
      )}

      {/* GPA result */}
      {gpa !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <ProgressRing value={gpa} max={10} size={100} strokeWidth={7} color={gpaHex(gpa)} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center" style={{ transform: 'rotate(90deg)' }}>
                  <p className="text-xl font-black tabular-nums leading-none" style={{ color: gpaHex(gpa) }}>
                    <AnimatedGPA value={gpa} />
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">/ 10</p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Semester GPA</p>
              <p className="text-3xl font-black tabular-nums mt-0.5" style={{ color: gpaHex(gpa) }}>
                <AnimatedGPA value={gpa} />
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {gpaLabel(gpa)} &middot; {totalCredits} credits &middot; {valid.length} course{valid.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Weighted sum</p>
              <p className="text-lg font-bold tabular-nums font-mono">{weighted.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">÷ {totalCredits}</p>
            </div>
          </div>

          {valid.length > 1 && (
            <div className="mt-4 pt-4 border-t border-border/60 space-y-1.5">
              {valid.map(r => {
                const g = r.grade as Grade
                const contribution = Number(r.credits) * (GRADE_POINTS[g] ?? 0)
                const share = totalCredits > 0 ? (contribution / weighted) * 100 : 0
                return (
                  <div key={r.id} className="flex items-center gap-3 text-xs">
                    <span className={cn('font-black w-4 text-center text-sm', GRADE_CONFIG[g]?.color)}>{g}</span>
                    <span className="text-muted-foreground w-10 tabular-nums">{r.credits}cr</span>
                    {r.name && (
                      <span className="text-muted-foreground text-[11px] truncate flex-shrink min-w-0 max-w-[120px]">{r.name}</span>
                    )}
                    <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${share}%`, backgroundColor: GRADE_CONFIG[g]?.hex }} />
                    </div>
                    <span className="text-muted-foreground tabular-nums w-10 text-right">{contribution.toFixed(0)} pts</span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Course rows ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div>
            <p className="text-sm font-semibold">Courses</p>
            {!isVtopMode && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Connect to VTOP to skip manually entering courses for a sem
              </p>
            )}
          </div>
          <button
            onClick={resetGPA}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>

        {/* Column headers */}
        {isVtopMode ? (
          <div className="grid grid-cols-[1fr_70px_90px_28px] gap-2 px-4 pt-3 pb-1 text-[11px] font-medium text-muted-foreground">
            <span>Course</span><span>Credits</span><span>Grade</span><span />
          </div>
        ) : (
          <div className="grid grid-cols-[100px_1fr_28px] gap-2 px-4 pt-3 pb-1 text-[11px] font-medium text-muted-foreground">
            <span>Credits</span><span>Grade</span><span />
          </div>
        )}

        <div className="px-3 pb-3 space-y-1.5">
          <AnimatePresence initial={false}>
            {rows.map(row => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'grid gap-2 items-center group',
                  isVtopMode
                    ? 'grid-cols-[1fr_70px_90px_28px]'
                    : 'grid-cols-[100px_1fr_28px]',
                )}
              >
                {/* VTOP mode: show course name as text input */}
                {isVtopMode && (
                  <input
                    type="text"
                    placeholder={row.code || 'Course name'}
                    value={row.name}
                    onChange={e => updateRow(row.id, 'name', e.target.value)}
                    className="h-9 w-full rounded-xl border border-border/60 bg-secondary/30 px-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-secondary transition-colors"
                  />
                )}

                {/* Credits — dropdown in manual mode, number display in VTOP mode */}
                {isVtopMode ? (
                  <input
                    type="number" min={1} max={10} placeholder="4"
                    value={row.credits}
                    onChange={e => updateRow(row.id, 'credits', e.target.value)}
                    onWheel={e => (e.target as HTMLInputElement).blur()}
                    className="h-9 w-full rounded-xl border border-border/60 bg-secondary/30 px-2 text-sm text-center text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                ) : (
                  <select
                    value={row.credits}
                    onChange={e => updateRow(row.id, 'credits', e.target.value)}
                    className="h-9 w-full rounded-xl border border-border/60 bg-secondary/30 px-2 text-sm text-center text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer appearance-none"
                  >
                    <option value="">—</option>
                    {CREDIT_OPTIONS.map(c => (
                      <option key={c} value={c}>{c} cr</option>
                    ))}
                  </select>
                )}

                {/* Grade */}
                <select
                  value={row.grade}
                  onChange={e => updateRow(row.id, 'grade', e.target.value)}
                  className={cn(
                    'h-9 w-full rounded-xl border bg-secondary/30 px-2 text-sm font-bold focus:outline-none focus:border-primary/50 transition-colors cursor-pointer appearance-none text-center',
                    GRADE_CONFIG[row.grade as Grade]?.color ?? 'text-foreground',
                    'border-border/60',
                  )}
                >
                  {GRADES.map(g => (
                    <option key={g} value={g} className="bg-card text-foreground font-bold">
                      {g} — {GRADE_POINTS[g]} pts
                    </option>
                  ))}
                </select>

                {/* Remove */}
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className="h-8 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-30"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 px-3 pb-3 border-t border-border/60 pt-3">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors"
          >
            <Plus className="size-3.5" /> Add row
          </button>
        </div>
      </div>

      {gpa === null && (
        <div className="rounded-2xl border border-border/40 border-dashed py-8 text-center text-sm text-muted-foreground">
          {isVtopMode ? 'Select a semester above or pick credits manually' : 'Select credits for at least one row to see your GPA'}
        </div>
      )}

      {/* Grade scale legend */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Grade scale</p>
        <div className="grid grid-cols-7 gap-1">
          {(Object.entries(GRADE_CONFIG) as [Grade, typeof GRADE_CONFIG[Grade]][]).map(([g, cfg]) => (
            <div key={g} className={cn('rounded-lg p-2 text-center border', cfg.bg, cfg.border)}>
              <p className={cn('text-base font-black', cfg.color)}>{g}</p>
              <p className="text-[10px] text-muted-foreground">{cfg.points}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
