import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取统计数据
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'month'
  const clubId = searchParams.get('clubId')
  const coachId = searchParams.get('coachId')

  // 基础过滤条件：按俱乐部过滤课程
  const baseWhere: any = {
    status: 'confirmed',
  }
  if (clubId) {
    baseWhere.course = { clubId: parseInt(clubId) }
  }
  // 按教练过滤
  if (coachId) {
    baseWhere.coachId = parseInt(coachId)
  }

  // 计算时间范围
  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'quarter':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default: // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const dateWhere = { ...baseWhere, createdAt: { gte: startDate } }

  // 总课时数
  const totalLessons = await prisma.lesson.count({ where: dateWhere })

  // 总时长
  const durationResult = await prisma.lesson.aggregate({
    where: dateWhere,
    _sum: { durationMinutes: true },
  })
  const totalMinutes = durationResult._sum.durationMinutes || 0

  // 活跃学员数
  const activeStudents = await prisma.lesson.groupBy({
    by: ['studentId'],
    where: dateWhere,
  })

  // 教练排名（优化N+1：一次查出所有教练统计）
  const coachStats = await prisma.lesson.groupBy({
    by: ['coachId'],
    where: dateWhere,
    _count: { id: true },
    _sum: { durationMinutes: true },
  })

  // 一次性查出所有教练信息
  const coachIds = coachStats.map(s => s.coachId)
  const coaches = await prisma.user.findMany({
    where: { id: { in: coachIds } },
    select: { id: true, name: true },
  })
  const coachMap = new Map(coaches.map(c => [c.id, c.name]))

  // 一次性查出每个教练的学员数
  const coachStudentStats = await prisma.lesson.groupBy({
    by: ['coachId', 'studentId'],
    where: dateWhere,
  })
  const coachStudentCount = new Map<number, Set<number>>()
  for (const stat of coachStudentStats) {
    if (!coachStudentCount.has(stat.coachId)) {
      coachStudentCount.set(stat.coachId, new Set())
    }
    coachStudentCount.get(stat.coachId)!.add(stat.studentId)
  }

  // 一次性查出每个教练的主授科目
  const coachCourseStats = await prisma.lesson.groupBy({
    by: ['courseId'],
    where: dateWhere,
  })
  const courseIds = [...new Set(coachCourseStats.map(s => s.courseId))]
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, subjectId: true, subject: { select: { name: true } } },
  })
  const courseSubjectMap = new Map(courses.map(c => [c.id, c.subject.name]))

  // 统计每个教练的各科目课时数
  const coachSubjectCount = new Map<number, Map<string, number>>()
  for (const stat of coachCourseStats) {
    const course = courses.find(c => c.id === stat.courseId)
    if (!course) continue
    // 需要通过 lesson 的 coachId 关联，这里简化处理
  }

  // 重新计算教练科目：需要先查出每条lesson的coachId和courseId
  const coachLessonsForSubject = await prisma.lesson.findMany({
    where: dateWhere,
    select: { coachId: true, courseId: true },
  })
  const coachSubjectMap2 = new Map<number, Map<string, number>>()
  for (const l of coachLessonsForSubject) {
    const subjectName = courseSubjectMap.get(l.courseId)
    if (!subjectName) continue
    if (!coachSubjectMap2.has(l.coachId)) {
      coachSubjectMap2.set(l.coachId, new Map())
    }
    const subjectMap = coachSubjectMap2.get(l.coachId)!
    subjectMap.set(subjectName, (subjectMap.get(subjectName) || 0) + 1)
  }

  const coachRanking = coachStats
    .sort((a, b) => (b._count.id || 0) - (a._count.id || 0))
    .slice(0, 10)
    .map((stat, index) => {
      // 找出主授科目（课时最多的）
      const subjectCounts = coachSubjectMap2.get(stat.coachId)
      let mainSubject = '-'
      if (subjectCounts && subjectCounts.size > 0) {
        const sorted = [...subjectCounts.entries()].sort((a, b) => b[1] - a[1])
        mainSubject = sorted[0][0]
        if (sorted.length > 1) mainSubject += `等${sorted.length}科`
      }

      return {
        rank: index + 1,
        name: coachMap.get(stat.coachId) || '未知',
        lessons: stat._count.id,
        hours: Math.round(((stat._sum.durationMinutes || 0) / 60) * 10) / 10,
        students: coachStudentCount.get(stat.coachId)?.size || 0,
        mainSubject,
      }
    })

  // 学员排名
  const studentStats = await prisma.lesson.groupBy({
    by: ['studentId'],
    where: dateWhere,
    _count: { id: true },
    _sum: { durationMinutes: true },
  })

  // 一次性查出所有学员信息
  const studentIds = studentStats.map(s => s.studentId)
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, name: true, coach: { select: { id: true, name: true } } },
  })
  const studentMap = new Map(students.map(s => [s.id, s]))

  // 一次性查出每个学员的科目数
  const studentLessonCourses = await prisma.lesson.findMany({
    where: dateWhere,
    select: { studentId: true, courseId: true },
  })
  const studentSubjectCount = new Map<number, Set<string>>()
  for (const l of studentLessonCourses) {
    const subjectName = courseSubjectMap.get(l.courseId)
    if (!subjectName) continue
    if (!studentSubjectCount.has(l.studentId)) {
      studentSubjectCount.set(l.studentId, new Set())
    }
    studentSubjectCount.get(l.studentId)!.add(subjectName)
  }

  const studentRanking = studentStats
    .sort((a, b) => (b._count.id || 0) - (a._count.id || 0))
    .slice(0, 10)
    .map((stat, index) => {
      const student = studentMap.get(stat.studentId)
      return {
        rank: index + 1,
        name: student?.name || '未知',
        coachName: student?.coach?.name || '-',
        lessons: stat._count.id,
        hours: Math.round(((stat._sum.durationMinutes || 0) / 60) * 10) / 10,
        subjects: studentSubjectCount.get(stat.studentId)?.size || 0,
      }
    })

  // 月度趋势（最近6个月）
  const monthlyTrend = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

    const count = await prisma.lesson.count({
      where: {
        ...baseWhere,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    })

    monthlyTrend.push({
      name: `${monthStart.getMonth() + 1}月`,
      课时: count,
    })
  }

  // 科目分布（优化N+1：使用已查出的课程数据）
  const subjectDistribution: Record<string, number> = {}
  for (const stat of coachCourseStats) {
    const subjectName = courseSubjectMap.get(stat.courseId)
    if (subjectName) {
      subjectDistribution[subjectName] = (subjectDistribution[subjectName] || 0) + 1
    }
  }

  const colors = ['#3b82f6', '#22c55e', '#a855f7', '#eab308', '#f97316', '#ec4899']
  const subjectData = Object.entries(subjectDistribution).map(([name, value], i) => ({
    name,
    value,
    color: colors[i % colors.length],
  }))

  // 本月收入（根据已确认课时 × 教练定价计算）
  const monthLessons = await prisma.lesson.findMany({
    where: dateWhere,
    include: {
      course: {
        include: {
          subject: { select: { id: true, durationMinutes: true } },
          coach: { select: { id: true } },
          club: { select: { id: true } },
        },
      },
    },
  })
  let monthIncome = 0
  for (const lesson of monthLessons) {
    const duration = lesson.durationMinutes || 0
    const standardDuration = lesson.course.subject.durationMinutes || 60

    // 从 CoachPrice 表查找价格（俱乐部+教练+科目+授课模式）
    const coachPrice = await prisma.coachPrice.findUnique({
      where: {
        clubId_coachId_subjectId_teachingMode: {
          clubId: lesson.course.club.id,
          coachId: lesson.course.coach.id,
          subjectId: lesson.course.subject.id,
          teachingMode: lesson.course.teachingMode,
        },
      },
    })
    const price = coachPrice ? Number(coachPrice.price) : 0

    // 按比例计算：实际时长 / 标准时长 × 教练单价
    monthIncome += standardDuration > 0 ? (duration / standardDuration) * price : price
  }
  monthIncome = Math.round(monthIncome * 100) / 100

  return NextResponse.json({
    totalLessons,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    activeStudents: activeStudents.length,
    monthIncome,
    coachRanking,
    studentRanking,
    monthlyTrend,
    subjectData,
  })
}
