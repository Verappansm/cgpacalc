'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
import { animate } from 'framer-motion'
import { VtopConnect } from '@/components/vtop-connect'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, Award, BookOpen,
  BarChart3, Target, Zap, ChevronRight, Wifi, Star, Shield, Flame, ChevronDown,
} from 'lucide-react'
import { useStore } from '@/store/calculator-store'
import { GRADE_CONFIG, GRADE_POINTS, type Grade } from '@/lib/constants'
import { cn } from '@/lib/utils'

const GRADE_ORDER: Grade[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F']

// ── Animated number counter ───────────────────────────────────────────────────

function Counter({ to, decimals = 2, delay = 0 }: { to: number; decimals?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const timer = setTimeout(() => {
      const ctrl = animate(0, to, {
        duration: 1.1, ease: [0.16, 1, 0.3, 1],
        onUpdate(v) { if (ref.current) ref.current.textContent = v.toFixed(decimals) },
      })
      return () => ctrl.stop()
    }, delay)
    return () => clearTimeout(timer)
  }, [to, decimals, delay])
  return <span ref={ref}>0.{decimals > 0 ? '0'.repeat(decimals) : ''}</span>
}

// ── Stagger entrance helper ───────────────────────────────────────────────────

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const, delay: 0.05 + i * 0.07 },
})

// ── Custom tooltips ───────────────────────────────────────────────────────────

function GpaTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-xl space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.name === 'sgpa' ? '#60a5fa' : '#34d399' }} />
          <span className="text-muted-foreground">{p.name === 'sgpa' ? 'SGPA' : 'CGPA'}</span>
          <span className="font-bold tabular-nums ml-auto pl-4">{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

function GradeTip({ active, payload }: { active?: boolean; payload?: { payload: { grade: string; count: number } }[] }) {
  if (!active || !payload?.[0]) return null
  const { grade, count } = payload[0].payload
  const cfg = GRADE_CONFIG[grade as Grade]
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className={cn('font-black text-xl', cfg?.color)}>{grade}</p>
      <p className="text-muted-foreground">{count} course{count !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Stat card with animated counter ─────────────────────────────────────────

function StatCard({ label, value, numValue, decimals = 2, sub, color, icon: Icon, delay = 0 }: {
  label: string
  value?: string | number
  numValue?: number
  decimals?: number
  sub?: string
  color?: string
  icon?: React.ComponentType<{ className?: string }>
  delay?: number
}) {
  return (
    <motion.div {...fadeUp(delay)} className="rounded-2xl border border-border bg-card p-4">
      {Icon && (
        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
          <Icon className="size-4 text-primary" />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn('text-3xl font-black tabular-nums mt-0.5', color ?? 'text-foreground')}>
        {numValue !== undefined
          ? <Counter to={numValue} decimals={decimals} delay={delay * 1000 + 200} />
          : value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  )
}

// ── Semester timeline strip ───────────────────────────────────────────────────

function SemTimeline({ data }: { data: { sem: string; sgpa: number; credits: number }[] }) {
  function gpaColor(g: number) {
    if (g >= 9) return { text: 'text-emerald-400', bg: 'bg-emerald-950/50', border: 'border-emerald-800/50', hex: '#34d399' }
    if (g >= 8) return { text: 'text-blue-400',    bg: 'bg-blue-950/50',    border: 'border-blue-800/50',    hex: '#60a5fa' }
    if (g >= 7) return { text: 'text-violet-400',  bg: 'bg-violet-950/50',  border: 'border-violet-800/50',  hex: '#a78bfa' }
    if (g >= 6) return { text: 'text-yellow-400',  bg: 'bg-yellow-950/50',  border: 'border-yellow-800/50',  hex: '#facc15' }
    return       { text: 'text-red-400',            bg: 'bg-red-950/50',     border: 'border-red-800/50',     hex: '#f87171' }
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {data.map((d, i) => {
        const c = gpaColor(d.sgpa)
        return (
          <motion.div
            key={d.sem}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
            className={cn('shrink-0 rounded-xl border px-3 py-2.5 text-center min-w-[80px]', c.bg, c.border)}
          >
            <p className={cn('text-xl font-black tabular-nums', c.text)}>{d.sgpa.toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{d.sem}</p>
            <p className="text-[9px] text-muted-foreground">{d.credits} cr</p>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Grade heatmap (semester × grade) ────────────────────────────────────────

function GradeHeatmap({ history }: { history: { semLabel: string; courses: { grade: string }[] }[] }) {
  // Sort chronologically: by year, then fall (0) before winter (1)
  const sorted = [...history].sort((a, b) => {
    const parse = (l: string) => {
      const m = l.match(/(\d{4})-(\d{2})/)
      return (m ? parseInt(m[1]) : 0) * 2 + (/winter/i.test(l) ? 1 : 0)
    }
    return parse(a.semLabel) - parse(b.semLabel)
  })

  const cells = sorted.map(h => {
    const counts = Object.fromEntries(GRADE_ORDER.map(g => [g, 0])) as Record<string, number>
    h.courses.forEach(c => { if (c.grade in counts) counts[c.grade]++ })
    const short = h.semLabel.replace(/Fall Semester/i, 'Fall').replace(/Winter Semester/i, 'Winter')
    return { sem: short, counts }
  })

  const maxCount = Math.max(...cells.flatMap(c => Object.values(c.counts)))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left text-[10px] text-muted-foreground font-medium pb-2 pr-3 whitespace-nowrap">Semester</th>
            {GRADE_ORDER.map(g => (
              <th key={g} className={cn('pb-2 px-1 text-center font-black text-sm', GRADE_CONFIG[g]?.color)}>{g}</th>
            ))}
          </tr>
        </thead>
        <tbody className="space-y-1">
          {cells.map((row, i) => (
            <motion.tr
              key={row.sem}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.05, duration: 0.3 }}
            >
              <td className="pr-3 py-1 text-[10px] text-muted-foreground whitespace-nowrap">{row.sem}</td>
              {GRADE_ORDER.map(g => {
                const count = row.counts[g]
                const intensity = maxCount > 0 ? count / maxCount : 0
                const cfg = GRADE_CONFIG[g as Grade]
                return (
                  <td key={g} className="px-1 py-1 text-center">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto text-xs font-bold tabular-nums transition-colors"
                      style={{
                        backgroundColor: count > 0 ? `${cfg?.hex}${Math.round(intensity * 0.55 * 255).toString(16).padStart(2, '0')}` : 'transparent',
                        color: count > 0 ? cfg?.hex : '#444',
                        border: count > 0 ? `1px solid ${cfg?.hex}33` : '1px solid transparent',
                      }}
                    >
                      {count > 0 ? count : '·'}
                    </div>
                  </td>
                )
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Achievement badges ────────────────────────────────────────────────────────

function AchievementBadge({ icon: Icon, label, sub, earned, color }: {
  icon: React.ComponentType<{ className?: string }>
  label: string; sub: string; earned: boolean; color: string
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border p-3 transition-colors',
      earned ? 'bg-card border-border' : 'bg-secondary/10 border-border/30 opacity-50',
    )}>
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        earned ? `bg-${color}-950/60 border border-${color}-800/50` : 'bg-secondary border border-border/40',
      )}>
        <Icon className={cn('size-4', earned ? `text-${color}-400` : 'text-muted-foreground')} />
      </div>
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold', earned ? 'text-foreground' : 'text-muted-foreground')}>{label}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
      {earned && <div className={`ml-auto w-1.5 h-1.5 rounded-full bg-${color}-400 shrink-0`} />}
    </div>
  )
}

// ── No-data placeholder ───────────────────────────────────────────────────────

function NoData() {
  const [showVtop, setShowVtop] = useState(false)
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="relative px-6 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
          </div>
          <div className="relative space-y-5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary border border-border mx-auto">
              <BarChart3 className="size-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold">Connect VTOP to unlock Analytics</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                GPA trends, grade heatmaps, semester comparisons and performance insights — all live from your academic history.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground max-w-xs mx-auto">
              {[
                'GPA trend & CGPA progression',
                'Grade distribution heatmap',
                'Semester timeline',
                'Top & bottom courses',
                'Consistency score',
                'Achievement badges',
              ].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-left">
                  <ChevronRight className="size-3 text-primary shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowVtop(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Wifi className="size-4" /> Connect VTOP
            </button>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {showVtop && <VtopConnect onClose={() => setShowVtop(false)} />}
      </AnimatePresence>
    </>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function Analytics() {
  const { vtopData, vtopConnected } = useStore()
  const [showDataLog, setShowDataLog] = useState(false)

  const { trendData, gradeDistData, semTimelineData, stats, yMin, yMax, yTicks } = useMemo(() => {
    if (!vtopData || vtopData.gradeHistory.length === 0) return {
      trendData: [], gradeDistData: [], semTimelineData: [], stats: null,
      yMin: 0, yMax: 10, yTicks: [0, 5, 6, 7, 8, 9, 10],
    }

    const GP = GRADE_POINTS as Record<string, number>

    // Sort grade history chronologically: by year, then fall before winter
    const sortKey = (label: string) => {
      const m = label.match(/(\d{4})-(\d{2})/)
      return (m ? parseInt(m[1]) : 0) * 2 + (/winter/i.test(label) ? 1 : 0)
    }
    const hist = [...vtopData.gradeHistory].sort((a, b) => sortKey(a.semLabel) - sortKey(b.semLabel))

    // GPA trend + CGPA progression
    let runCredits = 0
    let runWeighted = 0
    const trendData = hist.map(h => {
      runWeighted += h.courses.reduce((s, c) => s + c.credits * (GP[c.grade] ?? 0), 0)
      runCredits  += h.credits
      return {
        sem:  h.semLabel.replace(/Fall Semester/i, 'Fall').replace(/Winter Semester/i, 'Winter'),
        sgpa: h.gpa,
        cgpa: runCredits > 0 ? parseFloat((runWeighted / runCredits).toFixed(3)) : 0,
      }
    })

    // Chart Y-axis: zoom in on actual data range
    const allGpas = trendData.flatMap(d => [d.sgpa, d.cgpa]).filter(v => v > 0)
    const dataMin = allGpas.length > 0 ? Math.min(...allGpas) : 0
    const dataMax = allGpas.length > 0 ? Math.max(...allGpas) : 10
    const buffer = 0.4
    const yMin = Math.max(0, Math.floor((dataMin - buffer) * 10) / 10)
    const yMax = Math.min(10, Math.ceil((dataMax + buffer) * 10) / 10)
    // Generate ticks: 5 evenly spaced between yMin and yMax
    const yTicks = Array.from({ length: 5 }, (_, i) =>
      Math.round((yMin + (yMax - yMin) * i / 4) * 10) / 10
    )

    // Grade distribution
    const gradeCounts = Object.fromEntries(GRADE_ORDER.map(g => [g, 0])) as Record<string, number>
    hist.forEach(h => h.courses.forEach(c => { if (c.grade in gradeCounts) gradeCounts[c.grade]++ }))
    const gradeDistData = GRADE_ORDER.map(g => ({ grade: g, count: gradeCounts[g] }))

    // Semester timeline
    const semTimelineData = hist.map(h => ({
      sem: h.semLabel.replace(/Fall Semester/i, 'Fall').replace(/Winter Semester/i, 'Winter'),
      sgpa: h.gpa,
      credits: h.credits,
    }))

    // All courses
    const allCourses = hist.flatMap(h => h.courses.map(c => ({ ...c, semLabel: h.semLabel })))
    const sorted = [...allCourses].sort((a, b) => (GP[b.grade] ?? 0) - (GP[a.grade] ?? 0))

    // Stats
    const gpas = hist.map(h => h.gpa)
    const avgGpa = gpas.reduce((s, g) => s + g, 0) / gpas.length
    const stdDev = Math.sqrt(gpas.reduce((s, g) => s + (g - avgGpa) ** 2, 0) / gpas.length)
    const trend  = gpas.length >= 2 ? gpas[gpas.length - 1] - gpas[gpas.length - 2] : 0
    const bestSem  = hist.reduce((b, h) => h.gpa > b.gpa ? h : b, hist[0])
    const sGradeCount = gradeCounts['S'] ?? 0
    const passRate = allCourses.length > 0
      ? Math.round(allCourses.filter(c => c.grade !== 'F').length / allCourses.length * 100)
      : 100
    const topCourses = sorted.slice(0, 6)
    const bottomCourses = [...sorted].reverse().filter(c => c.grade !== 'S').slice(0, 5)

    return {
      trendData, gradeDistData, semTimelineData, yMin, yMax, yTicks,
      stats: { avgGpa, stdDev, trend, bestSem, sGradeCount, passRate, topCourses, bottomCourses, totalCourses: allCourses.length },
    }
  }, [vtopData])

  if (!vtopConnected || !vtopData || vtopData.gradeHistory.length === 0) {
    return (
      <div className="space-y-4">
        <NoData />
        {vtopConnected && vtopData && (
          <div className="rounded-2xl border border-border/40 border-dashed py-8 text-center text-sm text-muted-foreground">
            No grade history found. Complete a semester to see analytics.
          </div>
        )}
      </div>
    )
  }

  const trendDir = stats!.trend > 0.1 ? 'up' : stats!.trend < -0.1 ? 'down' : 'stable'
  const TrendIcon = trendDir === 'up' ? TrendingUp : trendDir === 'down' ? TrendingDown : Minus
  const trendColor = trendDir === 'up' ? 'text-emerald-400' : trendDir === 'down' ? 'text-red-400' : 'text-muted-foreground'
  const trendLabel = trendDir === 'up' ? 'Improving' : trendDir === 'down' ? 'Declining' : 'Stable'

  // Dynamic total: from VTOP if available, else 160
  const programTotal = vtopData.totalProgramCredits ?? 160

  const consistencyScore = Math.max(0, Math.min(10, 10 - stats!.stdDev * 5))

  return (
    <div className="space-y-5">

      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center gap-2.5 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-400">{vtopData.name}</p>
          <p className="text-[10px] text-muted-foreground">{vtopData.regNumber} · VIT Chennai · live from VTOP</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums text-emerald-400">{vtopData.cgpa.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">CGPA</p>
        </div>
      </motion.div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="CGPA"
          numValue={vtopData.cgpa}
          decimals={2}
          sub={`${vtopData.totalCredits} credits earned`}
          color={vtopData.cgpa >= 9 ? 'text-emerald-400' : vtopData.cgpa >= 8 ? 'text-blue-400' : 'text-violet-400'}
          icon={Award}
          delay={1}
        />
        <StatCard label="Avg SGPA" numValue={stats!.avgGpa} decimals={2} sub={`σ = ${stats!.stdDev.toFixed(2)}`} icon={Target} delay={2} />
        <StatCard label="S Grades" numValue={stats!.sGradeCount} decimals={0} sub={`out of ${stats!.totalCourses} courses`} color="text-emerald-400" icon={Star} delay={3} />
        <StatCard
          label="Trend"
          value={trendLabel}
          sub={`${stats!.trend > 0 ? '+' : ''}${stats!.trend.toFixed(2)} vs last sem`}
          color={trendColor}
          icon={TrendIcon}
          delay={4}
        />
      </div>

      {/* Semester timeline */}
      <motion.div {...fadeUp(5)} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/60">
          <p className="text-sm font-semibold">Semester Timeline</p>
          <p className="text-[11px] text-muted-foreground">SGPA per semester — color coded by performance</p>
        </div>
        <div className="p-4">
          <SemTimeline data={semTimelineData} />
        </div>
      </motion.div>

      {/* GPA trend chart */}
      <motion.div {...fadeUp(6)} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">GPA Trend</p>
              <p className="text-[11px] text-muted-foreground">SGPA per semester · CGPA progression</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-400/70" /><span className="text-muted-foreground">SGPA</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-400/70" /><span className="text-muted-foreground">CGPA</span></div>
            </div>
          </div>
        </div>
        <div className="px-2 py-4">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="gSgpa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCgpa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" vertical={false} />
              <XAxis dataKey="sem" tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={36} />
              <YAxis
                domain={[yMin, yMax]}
                ticks={yTicks}
                tickFormatter={(v) => v.toFixed(1)}
                tick={{ fontSize: 10, fill: '#666' }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<GpaTip />} />
              <ReferenceLine y={vtopData.cgpa} stroke="#34d399" strokeDasharray="4 2" strokeWidth={1} opacity={0.5} />
              <Area type="monotone" dataKey="sgpa" stroke="#60a5fa" strokeWidth={2.5} fill="url(#gSgpa)" dot={{ r: 4, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#60a5fa' }} isAnimationActive />
              <Area type="monotone" dataKey="cgpa" stroke="#34d399" strokeWidth={2} fill="url(#gCgpa)" dot={{ r: 3, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Grade distribution */}
      <motion.div {...fadeUp(7)} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60">
          <p className="text-sm font-semibold">Grade Distribution</p>
          <p className="text-[11px] text-muted-foreground">All {stats!.totalCourses} courses · {vtopData.gradeHistory.length} semesters</p>
        </div>
        <div className="px-2 py-4">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={gradeDistData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <XAxis dataKey="grade" tick={{ fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#666' }} tickLine={false} axisLine={false} width={20} allowDecimals={false} />
              <Tooltip content={<GradeTip />} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive>
                {gradeDistData.map(entry => (
                  <Cell key={entry.grade} fill={GRADE_CONFIG[entry.grade as Grade]?.hex ?? '#888'} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Quick grade breakdown pills */}
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {gradeDistData.filter(d => d.count > 0).map(d => {
            const cfg = GRADE_CONFIG[d.grade as Grade]
            const pct = Math.round((d.count / stats!.totalCourses) * 100)
            return (
              <div key={d.grade} className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1', cfg?.bg, cfg?.border)}>
                <span className={cn('text-xs font-black', cfg?.color)}>{d.grade}</span>
                <span className="text-[10px] text-muted-foreground">{d.count} ({pct}%)</span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Grade heatmap */}
      <motion.div {...fadeUp(8)} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60">
          <p className="text-sm font-semibold">Grade Heatmap</p>
          <p className="text-[11px] text-muted-foreground">Grades earned per semester · oldest → newest · darker = more courses</p>
        </div>
        <div className="p-5">
          <GradeHeatmap history={vtopData.gradeHistory} />
        </div>
      </motion.div>

      {/* Highlights row */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div {...fadeUp(9)} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Best semester</p>
          <p className="text-2xl font-black tabular-nums text-emerald-400">{stats!.bestSem.gpa.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {stats!.bestSem.semLabel.split('/').pop()?.trim() ?? stats!.bestSem.semLabel}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{stats!.bestSem.credits} credits · {stats!.bestSem.courses.length} courses</p>
        </motion.div>
        <motion.div {...fadeUp(9)} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Credit progress</p>
          <p className="text-2xl font-black tabular-nums text-blue-400">
            {vtopData.totalCredits} <span className="text-sm font-medium text-muted-foreground">/ {programTotal}</span>
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-blue-400/70"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (vtopData.totalCredits / programTotal) * 100)}%` }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {Math.round((vtopData.totalCredits / programTotal) * 100)}% of B.Tech complete · NGC / VITOL excluded
          </p>
        </motion.div>
      </div>

      {/* Consistency */}
      <motion.div {...fadeUp(10)} className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Consistency</p>
            <p className="text-[11px] text-muted-foreground">Semester-to-semester GPA stability · pass rate {stats!.passRate}%</p>
          </div>
        </div>
        {(() => {
          const label = consistencyScore >= 8 ? 'Very consistent' : consistencyScore >= 6 ? 'Consistent' : consistencyScore >= 4 ? 'Moderate variation' : 'High variation'
          const color = consistencyScore >= 8 ? '#34d399' : consistencyScore >= 6 ? '#60a5fa' : consistencyScore >= 4 ? '#facc15' : '#f87171'
          return (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                <span className="text-xs text-muted-foreground font-mono">σ = {stats!.stdDev.toFixed(3)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${consistencyScore * 10}%` }}
                  transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                <span>Unstable</span><span>Very consistent</span>
              </div>
            </>
          )
        })()}
      </motion.div>

      {/* Achievements */}
      <motion.div {...fadeUp(11)} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/60">
          <p className="text-sm font-semibold">Achievements</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <AchievementBadge icon={Award}  label="9+ CGPA Club"       sub="CGPA at or above 9.0"                earned={vtopData.cgpa >= 9}                  color="emerald" />
          <AchievementBadge icon={Shield} label="Perfect Attendance"  sub="Pass rate 100%"                      earned={stats!.passRate === 100}              color="blue"    />
          <AchievementBadge icon={Star}   label="S-Grade Collector"   sub="10 or more S grades"                 earned={stats!.sGradeCount >= 10}             color="violet"  />
          <AchievementBadge icon={Flame}  label="Semester Streak"     sub="All semesters above 8.0 SGPA"        earned={vtopData.gradeHistory.every(h => h.gpa >= 8)} color="orange" />
          <AchievementBadge icon={TrendingUp} label="On the Rise"     sub="Latest SGPA higher than previous"    earned={stats!.trend > 0.1}                  color="emerald" />
          <AchievementBadge icon={BookOpen}   label="Halfway There"   sub="80+ credits earned"                  earned={vtopData.totalCredits >= 80}         color="blue"    />
        </div>
      </motion.div>

      {/* Top courses */}
      <motion.div {...fadeUp(12)} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/60">
          <Award className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Best performing courses</p>
        </div>
        <div className="divide-y divide-border/40">
          {stats!.topCourses.map((c, i) => {
            const cfg = GRADE_CONFIG[c.grade as Grade]
            return (
              <motion.div
                key={`${c.code}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.05, duration: 0.25 }}
                className="flex items-center gap-3 px-5 py-3"
              >
                <span className={cn('text-xl font-black w-6 text-center shrink-0', cfg?.color)}>{c.grade}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{c.name || c.code}</p>
                  <p className="text-[10px] text-muted-foreground">{c.code} · {c.semLabel.split('/').pop()?.trim() ?? c.semLabel}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{c.credits} cr</span>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {stats!.bottomCourses.length > 0 && (
        <motion.div {...fadeUp(13)} className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/60">
            <Target className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Courses to improve</p>
          </div>
          <div className="divide-y divide-border/40">
            {stats!.bottomCourses.map((c, i) => {
              const cfg = GRADE_CONFIG[c.grade as Grade]
              return (
                <div key={`${c.code}-${i}`} className="flex items-center gap-3 px-5 py-3">
                  <span className={cn('text-xl font-black w-6 text-center shrink-0', cfg?.color)}>{c.grade}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{c.name || c.code}</p>
                    <p className="text-[10px] text-muted-foreground">{c.code} · {c.semLabel.split('/').pop()?.trim() ?? c.semLabel}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* VTOP data log */}
      <motion.div {...fadeUp(14)} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <button
          onClick={() => setShowDataLog(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-secondary/20 transition-colors"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">VTOP data fetched</p>
          <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', showDataLog && 'rotate-180')} />
        </button>
        {showDataLog && (
          <div className="px-5 pb-4 space-y-1.5 font-mono text-[11px]">
            <div>
              <span className="text-primary">StudentProfileAllView</span>
              <span className="text-muted-foreground"> → {vtopData.name} · {vtopData.regNumber}</span>
            </div>
            <div>
              <span className="text-primary">StudentGradeHistory</span>
              <span className="text-muted-foreground"> → {vtopData.gradeHistory.length} sems · {stats!.totalCourses} courses · CGPA {vtopData.cgpa.toFixed(2)} · {vtopData.totalCredits} credits earned{vtopData.totalProgramCredits ? ` / ${vtopData.totalProgramCredits} total` : ''}</span>
            </div>
            <div>
              <span className="text-primary">StudentTimeTableChn</span>
              <span className="text-muted-foreground"> → {vtopData.semesters.length} sems · current: {vtopData.semesters[0]?.label ?? 'none'}</span>
            </div>
            <div>
              <span className="text-primary">doStudentMarkView</span>
              <span className="text-muted-foreground"> → {vtopData.currentSemMarks.length} course{vtopData.currentSemMarks.length !== 1 ? 's' : ''} with marks</span>
            </div>
          </div>
        )}
      </motion.div>

      <p className="text-[10px] text-muted-foreground text-center pb-2">
        VITGPA Analytics · VIT Chennai · data sourced from VTOP grade history
      </p>
    </div>
  )
}
