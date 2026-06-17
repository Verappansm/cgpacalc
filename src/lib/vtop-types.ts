export type VtopSemester = {
  id: string
  label: string
}

export type VtopCourse = {
  code: string
  name: string
  type: 'THEORY' | 'LAB' | 'PROJECT'
  credits: number
  faculty?: string
}

export type VtopCourseMarks = {
  courseCode: string
  courseName: string
  cat1?: number       // raw out of 50
  cat2?: number       // raw out of 50
  internals?: number  // raw out of 30
  fat?: number        // raw out of 100 (FAT exam, when published)
  labInternal?: number // lab courses: sum of all internal component rows (out of 60)
}

export type VtopSemGrade = {
  code: string
  name: string
  credits: number
  grade: string
  courseType?: string  // TH, TL, ETL, ELA, EL, SS, etc.
}

export type VtopGradeHistory = {
  semId: string
  semLabel: string
  gpa: number
  credits: number
  courses: VtopSemGrade[]
}

export type VtopData = {
  name: string
  regNumber: string
  cgpa: number
  totalCredits: number
  totalProgramCredits?: number
  semesters: VtopSemester[]
  coursesBySem: Record<string, VtopCourse[]>
  gradeHistory: VtopGradeHistory[]
  currentSemMarks: VtopCourseMarks[]
  currentSemMarksId?: string
}
