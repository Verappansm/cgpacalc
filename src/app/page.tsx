'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Calculator, TrendingUp, Target, BarChart3, Plug } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-provider'

// Sharp, purposeful entrance — no bouncy or springy motion
const up = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' as const, delay },
})

const TOOLS = [
  {
    icon: Calculator,
    title: 'GPA Calculator',
    desc: 'Add courses, pick grades, get your semester GPA live.',
    tab: 'gpa',
  },
  {
    icon: TrendingUp,
    title: 'CGPA Calculator',
    desc: 'Combine semesters. Know exactly what you need to hit your target.',
    tab: 'cgpa',
  },
  {
    icon: Target,
    title: 'Grade Predictor',
    desc: "VIT's bell-curve grading. Predict your grade before results drop.",
    tab: 'grade',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'GPA trends and semester history pulled directly from VTOP.',
    tab: 'analytics',
  },
]

export default function LandingPage() {
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background">

      {/* Dot grid — colour and opacity differ per mode via .dot-grid class */}
      <div aria-hidden className="dot-grid pointer-events-none fixed inset-0 z-0" />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-8 h-14 border-b border-border/60 shrink-0">
        <span className="text-sm tracking-tight">
          <span className="font-semibold text-foreground/70">VIT</span><span className="font-black text-primary">GPA</span>
        </span>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-secondary/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            Open App <ArrowRight className="size-3 opacity-60" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center min-h-0">

        {/* Badge */}
        <motion.div {...up(0)}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground mb-6 shadow-sm">
            Built for VIT Chennai · 10-point grading scale
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 {...up(0.06)} className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.02] mb-4">
          The GPA toolkit
          <br />
          <span className="text-primary">for VIT.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p {...up(0.12)} className="text-sm text-muted-foreground max-w-[340px] mx-auto leading-relaxed mb-7">
          Calculate GPA and CGPA, predict grades with VIT&apos;s relative
          grading formula, and connect VTOP for automatic data fill.
        </motion.p>

        {/* CTAs */}
        <motion.div {...up(0.18)} className="flex items-center gap-3 mb-6 flex-wrap justify-center">
          <Link
            href="/app"
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20"
          >
            Open Calculator
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/app"
            className="group inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/25 hover:bg-secondary/50 active:scale-[0.98] transition-all"
          >
            <Plug className="size-3.5" />
            Connect VTOP
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.p {...up(0.23)} className="text-[11px] text-muted-foreground/60 flex items-center gap-2">
          <span>No login required</span>
          <span aria-hidden className="opacity-40">·</span>
          <span>Works offline</span>
          <span aria-hidden className="opacity-40">·</span>
          <span>VTOP auto-fill</span>
          <span aria-hidden className="opacity-40">·</span>
          <span>Open source</span>
        </motion.p>
      </section>

      {/* ── Tools ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-5 sm:px-8 pb-4 shrink-0">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground/50 shrink-0">
            Tools
          </span>
          <div className="flex-1 h-px bg-border/70" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-4xl mx-auto">
          {TOOLS.map((t, i) => (
            <motion.div
              key={t.tab}
              {...up(0.28 + i * 0.055)}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="h-full"
            >
              <Link
                href={`/app?tab=${t.tab}`}
                className={[
                  'group flex flex-col gap-2.5 h-full rounded-xl p-4 cursor-pointer',
                  'border border-border bg-card/80 backdrop-blur-sm',
                  'hover:border-primary/35 hover:bg-card',
                  'hover:shadow-[0_2px_16px_-4px_oklch(var(--primary)/0.12)]',
                  'transition-all duration-200',
                ].join(' ')}
              >
                <div className="w-7 h-7 rounded-lg bg-secondary border border-border/80 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/25 transition-colors">
                  <t.icon className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                <div className="flex-1">
                  <p className="text-xs font-semibold mb-0.5 group-hover:text-foreground transition-colors">
                    {t.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{t.desc}</p>
                </div>

                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground/50 group-hover:text-primary transition-colors">
                  Open
                  <ArrowRight className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border/50 px-8 h-10 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-muted-foreground/45"><span className="font-semibold">VIT</span><span className="font-bold text-primary/60">GPA</span> — unofficial, open-source</span>
        <span className="text-[10px] text-muted-foreground/45">Not affiliated with VIT Chennai</span>
      </footer>

    </div>
  )
}
