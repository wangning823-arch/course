/**
 * API 共享类型定义
 */

// ==================== 基础类型 ====================

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ==================== 用户相关 ====================

export type UserRole = 'super_admin' | 'club_admin' | 'full_time_coach' | 'part_time_coach'

export interface User {
  id: number
  name: string
  phone: string
  role: UserRole
  status: number
  clubId?: number | null
  createdAt: string
}

export interface UserWithClubs extends User {
  clubs: string
  clubCount: number
}

// ==================== 俱乐部相关 ====================

export interface Club {
  id: number
  name: string
  address?: string
  phone?: string
  description?: string
  adminId?: number
}

export interface ClubWithDetails extends Club {
  admin: string
  campuses: number
  coaches: number
}

// ==================== 校区相关 ====================

export interface Campus {
  id: number
  name: string
  address?: string
  phone?: string
  clubId: number
  clubName?: string
}

// ==================== 科目相关 ====================

export interface Subject {
  id: number
  name: string
  durationMinutes: number
  price?: number
  clubId: number | null
  coachId?: number | null
}

// ==================== 教练相关 ====================

export interface Coach {
  id: number
  name: string
  phone?: string
}

export interface CoachPrice {
  id: number
  coachId: number
  coachName: string
  subjectId: number
  subjectName: string
  clubId: number
  price: number
}

// ==================== 学员相关 ====================

export interface Student {
  id: number
  name: string
  phone?: string
  gender?: number
  parentName?: string
  parentPhone?: string
  clubId?: number
  coachId?: number
  type?: 'shared' | 'private' | 'solo'
}

// ==================== 课程相关 ====================

export type CourseStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface Course {
  id: number
  subjectId: number
  subject: string
  coachId: number
  coach: string
  campusId: number
  campus: string
  clubId: number
  scheduledDate: string
  startTime: string
  endTime: string
  status: CourseStatus
  hasLesson?: boolean
}

export interface CourseWithStudents extends Course {
  students: string
  studentIds: number[]
}

// ==================== 课时相关 ====================

export type LessonStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Lesson {
  id: number
  courseId: number
  date: string
  subject: string
  coach: string
  student: string
  campus: string
  duration: number
  content?: string
  performance?: string
  homework?: string
  status: LessonStatus
  confirmedById?: number
  createdAt: string
}

// ==================== 统计相关 ====================

export interface StatisticsData {
  totalLessons: number
  totalHours: number
  activeStudents: number
  coachRanking: CoachRankingItem[]
  studentRanking: StudentRankingItem[]
  monthlyTrend: MonthlyTrendItem[]
  subjectData: SubjectDataItem[]
}

export interface CoachRankingItem {
  id: number
  name: string
  lessons: number
  hours: number
}

export interface StudentRankingItem {
  id: number
  name: string
  lessons: number
  hours: number
}

export interface MonthlyTrendItem {
  month: string
  lessons: number
  hours: number
}

export interface SubjectDataItem {
  name: string
  value: number
}

// ==================== 反馈相关 ====================

export interface Feedback {
  id: number
  userId: number
  userName: string
  type: string
  content: string
  status: 'pending' | 'processed'
  reply?: string
  createdAt: string
}
