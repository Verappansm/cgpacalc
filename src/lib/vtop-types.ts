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
  cat1?: number     // raw score out of 50
  cat2?: number     // raw score out of 50
  internals?: number // raw score out of 30
}

export type VtopSemGrade = {
  code: string
  name: string
  credits: number
  grade: string
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
  semesters: VtopSemester[]
  coursesBySem: Record<string, VtopCourse[]>
  gradeHistory: VtopGradeHistory[]
  currentSemMarks: VtopCourseMarks[]
}
