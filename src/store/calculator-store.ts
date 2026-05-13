import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── GPA store ─────────────────────────────────────────────────────────────

export type CourseRow = {
  id: string
  credits: string
  grade: string
}

type GPAState = {
  rows: CourseRow[]
  addRow: () => void
  removeRow: (id: string) => void
  updateRow: (id: string, field: 'credits' | 'grade', value: string) => void
  resetGPA: () => void
}

// ── CGPA store ────────────────────────────────────────────────────────────

type CGPAState = {
  creditsDone: string
  cgpaSoFar: string
  creditsSem: string
  gpaSem: string
  targetCgpa: string
  setCgpaField: (field: keyof Omit<CGPAState, 'setCgpaField' | 'resetCGPA'>, value: string) => void
  resetCGPA: () => void
}

// ── Grade Predictor store ─────────────────────────────────────────────────

type GradeState = {
  cat1: string
  cat2: string
  internals: string
  cat1Avg: string
  cat2Avg: string
  internalAvg: string
  maxInt: string
  minInt: string
  classSize: string
  extSlider: number
  setGradeField: (
    field: keyof Omit<GradeState, 'setGradeField' | 'resetGrade' | 'setExtSlider'>,
    value: string,
  ) => void
  setExtSlider: (value: number) => void
  resetGrade: () => void
}

// ── Combined store ────────────────────────────────────────────────────────

type Store = GPAState & CGPAState & GradeState

const defaultRow = (): CourseRow => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  credits: '',
  grade: 'S',
})

export const useStore = create<Store>()(
  persist(
    (set) => ({
      // GPA
      rows: [defaultRow()],
      addRow: () => set(s => ({ rows: [...s.rows, defaultRow()] })),
      removeRow: (id) => set(s => ({ rows: s.rows.length > 1 ? s.rows.filter(r => r.id !== id) : s.rows })),
      updateRow: (id, field, value) =>
        set(s => ({ rows: s.rows.map(r => r.id === id ? { ...r, [field]: value } : r) })),
      resetGPA: () => set({ rows: [defaultRow()] }),

      // CGPA
      creditsDone: '', cgpaSoFar: '', creditsSem: '', gpaSem: '', targetCgpa: '',
      setCgpaField: (field, value) => set({ [field]: value } as Partial<Store>),
      resetCGPA: () => set({ creditsDone: '', cgpaSoFar: '', creditsSem: '', gpaSem: '', targetCgpa: '' }),

      // Grade Predictor
      cat1: '', cat2: '', internals: '',
      cat1Avg: '', cat2Avg: '', internalAvg: '',
      maxInt: '', minInt: '', classSize: '65',
      extSlider: 60,
      setGradeField: (field, value) => set({ [field]: value } as Partial<Store>),
      setExtSlider: (value) => set({ extSlider: value }),
      resetGrade: () => set({
        cat1: '', cat2: '', internals: '',
        cat1Avg: '', cat2Avg: '', internalAvg: '',
        maxInt: '', minInt: '', classSize: '65', extSlider: 60,
      }),
    }),
    { name: 'vit-calc-store' },
  ),
)
