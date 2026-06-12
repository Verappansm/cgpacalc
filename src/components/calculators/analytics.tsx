'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { VtopConnect } from '@/components/vtop-connect'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, Award, BookOpen,
  BarChart3, Target, Zap, ChevronRight, Wifi,
} from 'lucide-react'
import { useStore } from '@/store/calculator-store'
import { GRADE_CONFIG, GRADE_POINTS, type Grade } from '@/lib/constants'
import { cn } from '@/lib/utils'

const GRADE_ORDER: Grade[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F']

// ── Tooltip components ────────────────────────────────────────────────────────

function GpaTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-xl space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.name === 'sgpa' ? '#60a5fa' : '#34d399' }} />
          <span className="text-muted-foreground capitalize">{p.name === 'sgpa' ? 'SGPA' : 'CGPA'}</span>
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

function SemTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-xl space-y-1">
      <p className="font-semibold text-foreground truncate max-w-[160px]">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="text-muted-foreground">{p.name === 'gpa' ? 'SGPA' : 'Credits'}</span>
          <span className="font-bold ml-auto pl-4">{p.name === 'gpa' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string
  color?: string; icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {Icon && (
        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
          <Icon className="size-4 text-primary" />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn('text-3xl font-black tabular-nums mt-0.5', color ?? 'text-foreground')}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ── Course list card ───────────────────────────────────────────────────────────

function CourseListCard({ title, courses, icon: Icon }: {
  title: string
  courses: { code: string; name: string; grade: string; semLabel: string }[]
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/60">
        <Icon className="size-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="divide-y divide-border/40">
        {courses.slice(0, 5).map((c, i) => {
          const cfg = GRADE_CONFIG[c.grade as Grade]
          return (
            <div key={`${c.code}-${i}`} className="flex items-center gap-3 px-5 py-3">
              <span className={cn('text-xl font-black w-6 text-center shrink-0', cfg?.color)}>{c.grade}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{c.name || c.code}</p>
                <p className="text-[10px] text-muted-foreground">{c.code} · {c.semLabel.split('/').pop()?.trim() ?? c.semLabel}</p>
              </div>
            </div>
          )
        })}
      </div>
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
        <div className="relative px-6 py-12 text-center">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="relative space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary border border-border mx-auto">
              <BarChart3 className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Connect VTOP to unlock Analytics</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                GPA trends, grade distributions, semester comparisons and more — all from your VTOP academic history.
              </p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground max-w-xs mx-auto">
              {[
                'GPA trend and CGPA progression',
                'Grade distribution across all courses',
                'Semester-by-semester comparison',
                'Top and bottom performing courses',
              ].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <ChevronRight className="size-3 text-primary shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowVtop(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
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

// ── Main Analytics component ──────────────────────────────────────────────────

export function Analytics() {
  const { vtopData, vtopConnected } = useStore()

  // ── Derived data ─────────────────────────────────────────────────────────

  const { trendData, gradeDistData, semData, topCourses, bottomCourses, stats } = useMemo(() => {
    if (!vtopData || vtopData.gradeHistory.length === 0) return {
      trendData: [], gradeDistData: [], semData: [], topCourses: [], bottomCourses: [], stats: null,
    }

    const GP = GRADE_POINTS as Record<string, number>
    const hist = vtopData.gradeHistory

    // GPA trend + CGPA progression
    let runCredits = 0
    let runWeighted = 0
    const trendData = hist.map(h => {
      runWeighted += h.courses.reduce((s, c) => s + c.credits * (GP[c.grade] ?? 0), 0)
      runCredits  += h.credits
      return {
        sem:  h.semLabel.split('/').pop()?.trim().replace('SEMESTER', 'SEM').replace('  ', ' ') ?? h.semLabel.slice(0, 18),
        sgpa: h.gpa,
        cgpa: runCredits > 0 ? parseFloat((runWeighted / runCredits).toFixed(3)) : 0,
      }
    })

    // Grade distribution
    const gradeCounts = Object.fromEntries(GRADE_ORDER.map(g => [g, 0])) as Record<string, number>
    hist.forEach(h => h.courses.forEach(c => { if (c.grade in gradeCounts) gradeCounts[c.grade]++ }))
    const gradeDistData = GRADE_ORDER.map(g => ({ grade: g, count: gradeCounts[g] }))

    // Semester comparison
    const semData = hist.map(h => ({
      sem:     h.semLabel.split('/').pop()?.trim().replace('SEMESTER', 'SEM').replace('  ', ' ') ?? h.semLabel.slice(0, 18),
      gpa:     h.gpa,
      credits: h.credits,
    }))

    // All courses sorted by grade
    const allCourses = hist.flatMap(h => h.courses.map(c => ({ ...c, semLabel: h.semLabel })))
    const sorted = [...allCourses].sort((a, b) => (GP[b.grade] ?? 0) - (GP[a.grade] ?? 0))
    const topCourses = sorted.slice(0, 8)
    const bottomCourses = [...sorted].reverse().filter(c => c.grade !== 'S').slice(0, 5)

    // Stats
    const gpas = hist.map(h => h.gpa)
    const avgGpa = gpas.reduce((s, g) => s + g, 0) / gpas.length
    const stdDev = Math.sqrt(gpas.reduce((s, g) => s + (g - avgGpa) ** 2, 0) / gpas.length)
    const trend  = gpas.length >= 2 ? gpas[gpas.length - 1] - gpas[gpas.length - 2] : 0
    const bestSem  = hist.reduce((b, h) => h.gpa > b.gpa ? h : b, hist[0])
    const worstSem = hist.reduce((w, h) => h.gpa < w.gpa ? h : w, hist[0])

    return { trendData, gradeDistData, semData, topCourses, bottomCourses, stats: { avgGpa, stdDev, trend, bestSem, worstSem, totalCourses: allCourses.length } }
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

  const BTEC_TOTAL = 160

  return (
    <div className="space-y-5">

      {/* VTOP attribution */}
      <div className="flex items-center gap-2 text-[11px] text-emerald-400/80">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>Data sourced from <strong>VTOP grade history</strong> · {vtopData.name}</span>
      </div>

      {/* ── Summary stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="CGPA" value={vtopData.cgpa.toFixed(2)} sub={`${vtopData.totalCredits} credits`} color={vtopData.cgpa >= 9 ? 'text-emerald-400' : vtopData.cgpa >= 8 ? 'text-blue-400' : 'text-violet-400'} icon={Award} />
        <StatCard label="Semesters" value={vtopData.gradeHistory.length} sub={`${stats!.totalCourses} courses`} icon={BookOpen} />
        <StatCard label="Avg SGPA" value={stats!.avgGpa.toFixed(2)} sub={`σ = ${stats!.stdDev.toFixed(2)}`} icon={Target} />
        <StatCard
          label="Trend"
          value={trendLabel}
          sub={`${stats!.trend > 0 ? '+' : ''}${stats!.trend.toFixed(2)} vs last sem`}
          color={trendColor}
          icon={TrendIcon}
        />
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Best semester</p>
          <p className="text-2xl font-black tabular-nums text-emerald-400">{stats!.bestSem.gpa.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {stats!.bestSem.semLabel.split('/').pop()?.trim() ?? stats!.bestSem.semLabel}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Credit progress</p>
          <p className="text-2xl font-black tabular-nums text-blue-400">{vtopData.totalCredits} <span className="text-base font-medium text-muted-foreground">/ {BTEC_TOTAL}</span></p>
          <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-blue-400/70 transition-all" style={{ width: `${Math.min(100, (vtopData.totalCredits / BTEC_TOTAL) * 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{Math.round((vtopData.totalCredits / BTEC_TOTAL) * 100)}% complete (est.)</p>
        </div>
      </div>

      {/* ── GPA Trend chart ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
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
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCgpa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="sem" tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={36} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#555' }} tickLine={false} axisLine={false} ticks={[0, 5, 6, 7, 8, 9, 10]} width={24} />
              <Tooltip content={<GpaTip />} />
              <ReferenceLine y={vtopData.cgpa} stroke="#34d399" strokeDasharray="4 2" strokeWidth={1} opacity={0.4} />
              <Area type="monotone" dataKey="sgpa" stroke="#60a5fa" strokeWidth={2} fill="url(#gSgpa)" dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="cgpa" stroke="#34d399" strokeWidth={2} fill="url(#gCgpa)" dot={{ r: 3, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Grade Distribution + Semester Comparison (side-by-side on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Grade distribution */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <p className="text-sm font-semibold">Grade Distribution</p>
            <p className="text-[11px] text-muted-foreground">All {stats!.totalCourses} courses across {vtopData.gradeHistory.length} semesters</p>
          </div>
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gradeDistData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <XAxis dataKey="grade" tick={{ fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#555' }} tickLine={false} axisLine={false} width={20} allowDecimals={false} />
                <Tooltip content={<GradeTip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {gradeDistData.map(entry => (
                    <Cell key={entry.grade} fill={GRADE_CONFIG[entry.grade as Grade]?.hex ?? '#888'} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Semester comparison */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <p className="text-sm font-semibold">Semester Comparison</p>
            <p className="text-[11px] text-muted-foreground">SGPA · credits per semester</p>
          </div>
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={semData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="sem" tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={36} />
                <YAxis yAxisId="left" domain={[0, 10]} tick={{ fontSize: 10, fill: '#555' }} tickLine={false} axisLine={false} width={24} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#555' }} tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<SemTip />} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} formatter={v => v === 'gpa' ? 'SGPA' : 'Credits'} />
                <Bar yAxisId="right" dataKey="credits" fill="#a78bfa" opacity={0.4} radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Bar yAxisId="left"  dataKey="gpa"     fill="#60a5fa" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Consistency meter ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Consistency</p>
            <p className="text-[11px] text-muted-foreground">How stable your GPA is semester to semester</p>
          </div>
        </div>
        <div className="space-y-3">
          {(() => {
            const stdDev = stats!.stdDev
            const score = Math.max(0, Math.min(10, 10 - stdDev * 5))
            const label = score >= 8 ? 'Very consistent' : score >= 6 ? 'Consistent' : score >= 4 ? 'Moderate variation' : 'High variation'
            const color = score >= 8 ? '#34d399' : score >= 6 ? '#60a5fa' : score >= 4 ? '#facc15' : '#f87171'
            return (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                  <span className="text-xs text-muted-foreground">σ = {stdDev.toFixed(3)}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score * 10}%`, backgroundColor: color }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Unstable</span><span>Very consistent</span>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* ── Top courses ─────────────────────────────────────────────────── */}
      <CourseListCard
        title="Best performing courses"
        courses={topCourses}
        icon={Award}
      />

      {/* ── Bottom courses ───────────────────────────────────────────────── */}
      {bottomCourses.length > 0 && (
        <CourseListCard
          title="Courses to improve"
          courses={bottomCourses}
          icon={Target}
        />
      )}

      {/* Attribution */}
      <p className="text-[10px] text-muted-foreground text-center">
        Analytics · VIT Chennai · Sourced from VTOP grade history
      </p>
    </div>
  )
}
