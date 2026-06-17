'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Calculator, TrendingUp, Target, BarChart3, Plug } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-provider'

const up = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const, delay },
})

const TOOLS = [
  { icon: Calculator,  title: 'GPA Calculator',   desc: 'Add courses, pick grades, get your semester GPA live.',                       tab: 'gpa' },
  { icon: TrendingUp,  title: 'CGPA Calculator',  desc: 'Combine semesters. Know exactly what you need to hit your target.',           tab: 'cgpa' },
  { icon: Target,      title: 'Grade Predictor',  desc: "VIT's bell-curve grading. Predict your grade before results drop.",           tab: 'grade' },
  { icon: BarChart3,   title: 'Analytics',        desc: 'GPA trends and semester history pulled directly from VTOP.',                  tab: 'analytics' },
]

export default function LandingPage() {
  return (
    <div className="relative h-screen overflow-hidden flex flex-col bg-zinc-50 dark:bg-zinc-900 transition-colors">

      {/* Aurora */}
      <div aria-hidden className="absolute inset-0 overflow-hidden z-0">
        <div className="aurora-element" />
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 shrink-0 flex items-center justify-between px-6 sm:px-10 h-14 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-[14px] tracking-tight select-none">
          <span className="font-semibold text-zinc-400 dark:text-zinc-500">VIT</span>
          <span className="font-black text-primary">GPA</span>
        </span>
        <div className="flex items-center gap-3">
          <ThemeToggle className="border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800" />
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm px-4 py-1.5 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-all"
          >
            Open App <ArrowRight className="size-3 text-zinc-400" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {/* flex-1 gives this all remaining space; justify-center centers the block */}
      <section className="relative z-10 shrink-0 flex-1 flex flex-col items-center justify-center px-6 text-center gap-0 overflow-hidden">

        {/* Badge */}
        <motion.div {...up(0)} className="mb-5">
          <span className="inline-flex items-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm px-4 py-1.5 text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
            Built for VIT Chennai &nbsp;·&nbsp; 10-point grading scale
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...up(0.07)}
          className="text-[clamp(2.8rem,9vw,6rem)] font-black tracking-tighter leading-[0.93] text-zinc-900 dark:text-white mb-4"
        >
          The GPA toolkit
          <br />
          <span className="text-primary">for VIT.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p {...up(0.14)} className="text-[15px] text-zinc-500 dark:text-zinc-400 max-w-[360px] mx-auto leading-relaxed mb-6">
          Calculate GPA and CGPA, predict grades with VIT&apos;s relative
          grading formula, and connect VTOP for automatic data fill.
        </motion.p>

        {/* CTAs */}
        <motion.div {...up(0.20)} className="flex items-center gap-3 mb-5 flex-wrap justify-center">
          <Link
            href="/app"
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-2.5 text-[15px] font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
          >
            Open Calculator
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/app?vtop=open"
            className="group inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm px-6 py-2.5 text-[15px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
          >
            <Plug className="size-4" />
            Connect VTOP
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.p {...up(0.25)} className="text-[12px] text-zinc-400 dark:text-zinc-500 flex items-center gap-2 flex-wrap justify-center">
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
      <section className="relative z-10 shrink-0 px-5 sm:px-8 pb-4">
        {/* Label + rule — constrained to same width as cards */}
        <div className="max-w-4xl mx-auto flex items-center gap-3 mb-2.5">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-400 dark:text-zinc-500 shrink-0">
            Tools
          </span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700/60" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-4xl mx-auto">
          {TOOLS.map((t, i) => (
            <motion.div
              key={t.tab}
              {...up(0.30 + i * 0.055)}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="h-full"
            >
              <Link
                href={`/app?tab=${t.tab}`}
                className={[
                  'group flex flex-col gap-2 h-full rounded-xl p-3.5 cursor-pointer',
                  'border border-zinc-200 dark:border-zinc-700/70',
                  'bg-white/60 dark:bg-zinc-800/40 backdrop-blur-sm',
                  'hover:border-primary/40 hover:bg-white dark:hover:bg-zinc-800/70',
                  'hover:shadow-[0_4px_24px_-6px_oklch(0.62_0.19_238_/_0.18)]',
                  'transition-all duration-200',
                ].join(' ')}
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-600 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                  <t.icon className="size-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold mb-0.5 text-zinc-800 dark:text-zinc-100 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    {t.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">{t.desc}</p>
                </div>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 group-hover:text-primary transition-colors">
                  Open <ArrowRight className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-8 h-9 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          <span className="font-semibold">VIT</span><span className="font-black text-primary/70">GPA</span>
          {' '}— unofficial, open-source
        </span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Not affiliated with VIT Chennai</span>
      </footer>

    </div>
  )
}
