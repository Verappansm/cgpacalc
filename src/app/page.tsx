'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Calculator, TrendingUp, Target, BarChart3, Zap, Plug } from 'lucide-react'

const FEATURES = [
  {
    icon: Calculator,
    title: 'GPA Calculator',
    desc: 'Live semester GPA. Add courses, pick grades — instant result.',
    tab: 'gpa',
    accent: '#60a5fa',
    border: 'hover:border-blue-700/70',
    glow: 'hover:shadow-blue-950/60',
    iconBg: 'bg-blue-950/60 border-blue-800/40',
    iconColor: 'text-blue-400',
    tag: 'text-blue-400',
  },
  {
    icon: TrendingUp,
    title: 'CGPA Calculator',
    desc: 'Combine semesters. Target your CGPA and know what you need.',
    tab: 'cgpa',
    accent: '#a78bfa',
    border: 'hover:border-violet-700/70',
    glow: 'hover:shadow-violet-950/60',
    iconBg: 'bg-violet-950/60 border-violet-800/40',
    iconColor: 'text-violet-400',
    tag: 'text-violet-400',
  },
  {
    icon: Target,
    title: 'Grade Predictor',
    desc: "VIT's relative grading bell curve — predict your grade before results.",
    tab: 'grade',
    accent: '#34d399',
    border: 'hover:border-emerald-700/70',
    glow: 'hover:shadow-emerald-950/60',
    iconBg: 'bg-emerald-950/60 border-emerald-800/40',
    iconColor: 'text-emerald-400',
    tag: 'text-emerald-400',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'GPA trends and semester history, visualised. Powered by VTOP.',
    tab: 'analytics',
    accent: '#fb923c',
    border: 'hover:border-orange-700/70',
    glow: 'hover:shadow-orange-950/60',
    iconBg: 'bg-orange-950/60 border-orange-800/40',
    iconColor: 'text-orange-400',
    tag: 'text-orange-400',
  },
]

export default function LandingPage() {
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background select-none">

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-primary/[0.07] blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full bg-blue-600/[0.04] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-violet-600/[0.04] blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-border/30">
        <span className="text-base font-black tracking-tighter">
          VIT<span className="text-primary">GPA</span>
        </span>
        <Link
          href="/app"
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/25 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          Open App <ArrowRight className="size-3" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center gap-7 pt-2">

        {/* Pill badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center gap-2 flex-wrap"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/20 px-3 py-1 text-[11px] text-muted-foreground">
            VIT Chennai · 10-point scale
          </span>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Plug className="size-2.5" />
            Connect to VTOP for auto-fill
          </Link>
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <h1 className="text-8xl sm:text-9xl font-black tracking-tighter leading-none">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.45) 100%)' }}
            >
              VIT
            </span>
            <span className="text-primary">GPA</span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed"
        >
          Calculate. Predict. Analyse.
          <br />
          Your complete VIT grade toolkit.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          className="flex items-center gap-3"
        >
          <Link
            href="/app"
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Start Calculating
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <Zap className="size-3.5" />
            Connect VTOP
          </Link>
        </motion.div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 px-5 pb-5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.tab}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.28 + i * 0.07 }}
            >
              <Link
                href={`/app?tab=${f.tab}`}
                className={`group flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 transition-all duration-200 hover:shadow-xl ${f.border} ${f.glow} cursor-pointer`}
              >
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${f.iconBg}`}>
                  <f.icon className={`size-3.5 ${f.iconColor}`} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold leading-tight">{f.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
                <p className={`text-[10px] font-semibold flex items-center gap-1 ${f.tag}`}>
                  Open <ArrowRight className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 px-8 py-3 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/60">VITGPA — unofficial, open-source</span>
        <span className="text-[10px] text-muted-foreground/60">Not affiliated with VIT Chennai</span>
      </footer>

    </div>
  )
}
