'use client'

import { motion, type Variants } from 'framer-motion'
import { BarChart3, TrendingUp, BookOpen, Lock, ExternalLink, Sparkles, GitBranch, PieChart, Calendar } from 'lucide-react'

const PLANNED_FEATURES = [
  {
    icon: TrendingUp,
    title: 'GPA Trend',
    description: 'Semester-by-semester GPA chart to visualize your academic trajectory over time.',
  },
  {
    icon: PieChart,
    title: 'Credit Completion',
    description: 'Donut chart of completed vs remaining credits by category (core, elective, lab, etc.).',
  },
  {
    icon: BarChart3,
    title: 'Grade Distribution',
    description: 'Bar chart of how your grades are spread across S, A, B, C — benchmark against peers.',
  },
  {
    icon: GitBranch,
    title: 'Semester Comparison',
    description: 'Side-by-side comparison of each semester\'s GPA, credits, and grade mix.',
  },
  {
    icon: Calendar,
    title: 'Academic Timeline',
    description: 'Full academic history at a glance — every semester, GPA, and milestone in one view.',
  },
  {
    icon: Sparkles,
    title: 'Year in Review',
    description: 'Wrapped-style annual summary of your academic performance, highlights, and streaks.',
  },
]

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
}

export function Analytics() {
  return (
    <div className="space-y-5">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="relative px-6 py-8 text-center">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
              <Lock className="size-3" />
              Coming Soon
            </div>

            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Analytics Dashboard
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
              Deep insights into your academic performance — semester trends, grade distributions, and more.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-4 py-2.5 text-xs text-muted-foreground">
              <BookOpen className="size-3.5 shrink-0" />
              <span>Requires login to</span>
              <span className="font-mono font-semibold text-foreground">vtopcc.vit.ac.in</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* How it'll work */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border/60">
          <p className="text-sm font-semibold">How it will work</p>
          <p className="text-xs text-muted-foreground">The planned implementation</p>
        </div>
        <div className="p-5 space-y-3">
          {[
            { step: '01', title: 'Connect VTOP', desc: 'Authenticate securely via VTOP student portal. No credentials stored — session-only.' },
            { step: '02', title: 'Extract history', desc: 'Pull your full grade history, credits earned, and semester GPAs from the VTOP API.' },
            { step: '03', title: 'See insights', desc: 'Instantly visualize trends, distributions, and projections — all computed client-side.' },
          ].map(s => (
            <div key={s.step} className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-black text-primary">{s.step}</span>
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Planned features grid */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Planned features
        </p>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {PLANNED_FEATURES.map(f => (
            <motion.div
              key={f.title}
              variants={item}
              className="rounded-2xl border border-border/60 bg-card p-4 flex gap-3"
            >
              <div className="shrink-0 w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                <f.icon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* VTOP link */}
      <motion.a
        href="https://vtopcc.vit.ac.in/vtop/content"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-5 py-4 hover:bg-secondary/40 transition-colors group"
      >
        <div>
          <p className="text-sm font-semibold">VTOP Student Portal</p>
          <p className="text-xs text-muted-foreground mt-0.5">vtopcc.vit.ac.in</p>
        </div>
        <ExternalLink className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </motion.a>

    </div>
  )
}
