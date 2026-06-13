import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VtopData } from '@/lib/vtop-types'

// ── GPA store ─────────────────────────────────────────────────────────────────

export type CourseRow = {
  id: string
  code: string
  name: string
  credits: string
  grade: string
  type: 'THEORY' | 'LAB' | 'PROJECT' | ''
}

type GPAState = {
  rows: CourseRow[]
  selectedSemId: string | null
  addRow: () => void
  removeRow: (id: string) => void
  updateRow: (id: string, field: keyof Pick<CourseRow, 'credits' | 'grade' | 'name'>, value: string) => void
  setRows: (rows: CourseRow[]) => void
  setSelectedSemId: (id: string | null) => void
  resetGPA: () => void
}

// ── CGPA store ────────────────────────────────────────────────────────────────

type CGPAState = {
  creditsDone: string
  cgpaSoFar: string
  creditsSem: string
  gpaSem: string
  targetCgpa: string
  setCgpaField: (
    field: keyof Omit<CGPAState, 'setCgpaField' | 'resetCGPA'>,
    value: string,
  ) => void
  resetCGPA: () => void
}

// ── Grade Predictor store ─────────────────────────────────────────────────────

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
  extSlider: number   // user's FAT marks (0-100)
  fatAvg: string      // class FAT average out of 100 (when fatExamDone)
  fatExamDone: boolean
  labInternalTotal: string  // lab: sum of internal components, out of 60
  labFat: string            // lab: FAT marks out of 100
  selectedGradeCode: string | null
  setGradeField: (
    field: keyof Omit<GradeState, 'setGradeField' | 'resetGrade' | 'setExtSlider' | 'setSelectedGradeCode' | 'fatExamDone' | 'setFatExamDone'>,
    value: string,
  ) => void
  setExtSlider: (value: number) => void
  setFatExamDone: (v: boolean) => void
  setSelectedGradeCode: (code: string | null) => void
  resetGrade: () => void
}

// ── VTOP store (not persisted) ────────────────────────────────────────────────

type VtopState = {
  vtopData: VtopData | null
  vtopConnected: boolean
  vtopLoading: boolean
  vtopError: string | null
  connectVtop: (data: VtopData) => void
  setVtopLoading: (v: boolean) => void
  setVtopError: (v: string | null) => void
  disconnectVtop: () => void
}

// ── Combined store ────────────────────────────────────────────────────────────

type Store = GPAState & CGPAState & GradeState & VtopState

const defaultRow = (): CourseRow => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  code: '',
  name: '',
  credits: '',
  grade: 'S',
  type: '',
})

export const useStore = create<Store>()(
  persist(
    (set) => ({
      // ── GPA ──────────────────────────────────────────────────────────────
      rows: Array.from({ length: 7 }, defaultRow),
      selectedSemId: null,
      addRow: () => set(s => ({ rows: [...s.rows, defaultRow()] })),
      removeRow: (id) =>
        set(s => ({ rows: s.rows.length > 1 ? s.rows.filter(r => r.id !== id) : s.rows })),
      updateRow: (id, field, value) =>
        set(s => ({ rows: s.rows.map(r => r.id === id ? { ...r, [field]: value } : r) })),
      setRows: (rows) => set({ rows }),
      setSelectedSemId: (id) => set({ selectedSemId: id }),
      resetGPA: () => set({ rows: Array.from({ length: 7 }, defaultRow), selectedSemId: null }),

      // ── CGPA ─────────────────────────────────────────────────────────────
      creditsDone: '', cgpaSoFar: '', creditsSem: '', gpaSem: '', targetCgpa: '',
      setCgpaField: (field, value) => set({ [field]: value } as Partial<Store>),
      resetCGPA: () => set({ creditsDone: '', cgpaSoFar: '', creditsSem: '', gpaSem: '', targetCgpa: '' }),

      // ── Grade Predictor ───────────────────────────────────────────────────
      cat1: '', cat2: '', internals: '',
      cat1Avg: '', cat2Avg: '', internalAvg: '',
      maxInt: '', minInt: '', classSize: '65',
      extSlider: 60,
      fatAvg: '', fatExamDone: false,
      labInternalTotal: '', labFat: '',
      selectedGradeCode: null,
      setGradeField: (field, value) => set({ [field]: value } as Partial<Store>),
      setExtSlider: (value) => set({ extSlider: value }),
      setFatExamDone: (v) => set({ fatExamDone: v }),
      setSelectedGradeCode: (code) => set({ selectedGradeCode: code }),
      resetGrade: () => set({
        cat1: '', cat2: '', internals: '',
        cat1Avg: '', cat2Avg: '', internalAvg: '',
        maxInt: '', minInt: '', classSize: '65', extSlider: 60,
        fatAvg: '', fatExamDone: false,
        labInternalTotal: '', labFat: '',
        selectedGradeCode: null,
      }),

      // ── VTOP (not persisted via partialize) ───────────────────────────────
      vtopData: null,
      vtopConnected: false,
      vtopLoading: false,
      vtopError: null,
      connectVtop: (data) => set({ vtopData: data, vtopConnected: true, vtopError: null, vtopLoading: false }),
      setVtopLoading: (v) => set({ vtopLoading: v }),
      setVtopError: (v) => set({ vtopError: v, vtopLoading: false }),
      disconnectVtop: () => set({
        vtopData: null, vtopConnected: false, vtopError: null,
        // Reset all calculator state so VTOP-filled data is wiped
        rows: Array.from({ length: 7 }, defaultRow), selectedSemId: null,
        creditsDone: '', cgpaSoFar: '', creditsSem: '', gpaSem: '', targetCgpa: '',
        cat1: '', cat2: '', internals: '',
        cat1Avg: '', cat2Avg: '', internalAvg: '',
        maxInt: '', minInt: '', classSize: '65', extSlider: 60,
        fatAvg: '', fatExamDone: false,
        labInternalTotal: '', labFat: '',
        selectedGradeCode: null,
      }),
    }),
    {
      name: 'vit-calc-store',
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // VTOP data is never persisted. If rows were filled from a VTOP session
        // (id starts with 'vtop-'), clear them so stale course data doesn't survive a reload.
        if (state.rows.some(r => r.id.startsWith('vtop-'))) {
          state.rows = Array.from({ length: 7 }, defaultRow)
          state.selectedSemId = null
        }
      },
      partialize: (state) => ({
        rows: state.rows,
        selectedSemId: state.selectedSemId,
        creditsDone: state.creditsDone,
        cgpaSoFar: state.cgpaSoFar,
        creditsSem: state.creditsSem,
        gpaSem: state.gpaSem,
        targetCgpa: state.targetCgpa,
        cat1: state.cat1,
        cat2: state.cat2,
        internals: state.internals,
        cat1Avg: state.cat1Avg,
        cat2Avg: state.cat2Avg,
        internalAvg: state.internalAvg,
        maxInt: state.maxInt,
        minInt: state.minInt,
        classSize: state.classSize,
        extSlider: state.extSlider,
        fatAvg: state.fatAvg,
        fatExamDone: state.fatExamDone,
        labInternalTotal: state.labInternalTotal,
        labFat: state.labFat,
        selectedGradeCode: state.selectedGradeCode,
      }),
    },
  ),
)
