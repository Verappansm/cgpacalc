'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Calculator, TrendingUp, Target, BarChart3, ChevronRight } from 'lucide-react'

const FEATURES = [
  {
    icon: Calculator,
    title: 'GPA Calculator',
    desc: 'Instant semester GPA with live calculation. Add courses, pick grades — done.',
  },
  {
    icon: TrendingUp,
    title: 'CGPA Calculator',
    desc: 'Combine past CGPA with current semester. See where you stand and where you need to be.',
  },
  {
    icon: Target,
    title: 'Grade Predictor',
    desc: "Uses VIT's relative grading formula and your class statistics to estimate your final grade.",
  },
  {
    icon: BarChart3,
    title: 'Analytics (soon)',
    desc: 'GPA trends, semester comparisons, and a grade-history wrapped — powered by VTOP data.',
  },
]

const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">
            VIT <span className="text-primary">GPA</span>
          </span>
          <Link
            href="/app"
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            Open Calculator <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.div
            variants={fade}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground mb-6">
              Built for VIT Chennai · 10-point grading scale
            </span>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05]">
              Know your GPA
              <br />
              <span className="text-primary">before results drop.</span>
            </h1>
          </motion.div>

          <motion.p
            variants={fade}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            Instant GPA and CGPA calculation. Grade prediction using VIT&apos;s relative grading
            formula. All live, all local — no login required.
          </motion.p>

          <motion.div
            variants={fade}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-3"
          >
            <Link
              href="/app"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start Calculating
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-1 rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              See features
            </a>
          </motion.div>

          {/* Mini GPA preview card */}
          <motion.div
            variants={fade}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mx-auto max-w-sm"
          >
            <div className="rounded-2xl border border-border bg-card p-5 text-left shadow-2xl shadow-black/40">
              <p className="text-xs text-muted-foreground mb-3">This semester</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black text-primary">9.25</p>
                  <p className="text-xs text-muted-foreground mt-1">24 credits · 6 courses</p>
                </div>
                <div className="space-y-1">
                  {[['Data Structures', '4', 'S'], ['Algorithms', '4', 'A'], ['OS', '3', 'S']].map(([c, cr, g]) => (
                    <div key={c} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground truncate w-28">{c}</span>
                      <span className="text-muted-foreground">{cr}cr</span>
                      <span className={`font-bold ${g === 'S' ? 'text-emerald-400' : 'text-blue-400'}`}>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/50 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-12">
            What&apos;s inside
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fade}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-card p-5 space-y-3 hover:border-border/80 transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <f.icon className="size-4 text-primary" />
                </div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/app"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Open Calculator <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>VIT GPA Calculator — unofficial, open-source</span>
          <span>Not affiliated with VIT Chennai. Results are estimates only.</span>
        </div>
      </footer>
    </div>
  )
}
