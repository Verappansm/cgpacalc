'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { GPACalculator } from '@/components/calculators/gpa'
import { CGPACalculator } from '@/components/calculators/cgpa'
import { GradePredictor } from '@/components/calculators/grade-predictor'
import { Analytics } from '@/components/calculators/analytics'

const variants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

function AppContent() {
  const params = useSearchParams()
  const tab = params.get('tab') ?? 'gpa'

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tab}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {tab === 'gpa'       && <GPACalculator />}
        {tab === 'cgpa'      && <CGPACalculator />}
        {tab === 'grade'     && <GradePredictor />}
        {tab === 'analytics' && <Analytics />}
      </motion.div>
    </AnimatePresence>
  )
}

export default function AppPage() {
  return (
    <Suspense>
      <AppContent />
    </Suspense>
  )
}
