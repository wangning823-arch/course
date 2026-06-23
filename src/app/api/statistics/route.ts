import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取统计数据
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'month'
  const clubId = searchParams.get('clubId')
  const coachId = searchParams.get('coachId')

  // 基础过滤条件：按俱乐部过滤课程（使用 course.scheduledDate 而非 lesson.createdAt）
  const baseWhere: any = {
    status: 'confirmed',
  }
  if (clubId && clubId !== 'all') {
    baseWhere.course = { clubId: parseInt(clubId) }
  }
  // 按教练过滤
  if (coachId) {
    baseWhere.coachId = parseInt(coachId)
  }

  // 计算时间范围（基于课程的 scheduledDate）
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

  // 使用 course.scheduledDate 过滤（补录课时不会影响统计准确性）
  const dateWhere = { ...baseWhere, course: { ...baseWhere.course, scheduledDate: { gte: startDate } } }

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

  // 教练排名（一次查出所有教练统计）
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

  // 一次性查出每条 lesson 的 coachId 和 courseId（用于计算科目分布）
  const coachLessonsForSubject = await prisma.lesson.findMany({
    where: dateWhere,
    select: { coachId: true, courseId: true },
  })

  // 一次性查出所有相关课程的科目信息
  const courseIdsForSubject = [...new Set(coachLessonsForSubject.map(l => l.courseId))]
  const coursesForSubject = await prisma.course.findMany({
    where: { id: { in: courseIdsForSubject } },
    select: { id: true, subject: { select: { name: true } } },
  })
  const courseSubjectMap = new Map(coursesForSubject.map(c => [c.id, c.subject.name]))

  // 统计每个教练的各科目课时数
  const coachSubjectMap = new Map<number, Map<string, number>>()
  for (const l of coachLessonsForSubject) {
    const subjectName = courseSubjectMap.get(l.courseId)
    if (!subjectName) continue
    if (!coachSubjectMap.has(l.coachId)) {
      coachSubjectMap.set(l.coachId, new Map())
    }
    const subjectMap = coachSubjectMap.get(l.coachId)!
    subjectMap.set(subjectName, (subjectMap.get(subjectName) || 0) + 1)
  }

  const coachRanking = coachStats
    .sort((a, b) => (b._count.id || 0) - (a._count.id || 0))
    .slice(0, 10)
    .map((stat, index) => {
      // 找出主授科目（课时最多的）
      const subjectCounts = coachSubjectMap.get(stat.coachId)
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
  const studentSubjectCount = new Map<number, Set<string>>()
  for (const l of coachLessonsForSubject) {
    // 复用已查询的 coachLessonsForSubject，按 studentId 分组
  }
  // 重新查询学员维度的课程数据
  const studentLessonCourses = await prisma.lesson.findMany({
    where: dateWhere,
    select: { studentId: true, courseId: true },
  })
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

  // 月度趋势（最近6个月）- 使用一次查询优化 N+1
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const monthlyLessons = await prisma.lesson.findMany({
    where: {
      ...baseWhere,
      course: { ...baseWhere.course, scheduledDate: { gte: sixMonthsAgo } },
    },
    select: { course: { select: { scheduledDate: true } } },
  })

  // 按月分组统计
  const monthlyCountMap = new Map<string, number>()
  for (const lesson of monthlyLessons) {
    const monthKey = `${lesson.course.scheduledDate.getFullYear()}-${lesson.course.scheduledDate.getMonth()}`
    monthlyCountMap.set(monthKey, (monthlyCountMap.get(monthKey) || 0) + 1)
  }

  // 生成最近6个月的数据
  const monthlyTrend = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`
    monthlyTrend.push({
      name: `${monthDate.getMonth() + 1}月`,
      课时: monthlyCountMap.get(monthKey) || 0,
    })
  }

  // 科目分布（使用已查出的课程数据）
  const subjectDistribution: Record<string, number> = {}
  for (const l of coachLessonsForSubject) {
    const subjectName = courseSubjectMap.get(l.courseId)
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

  // 本月收入（批量查询优化 N+1）
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

  // 批量查询所有教练定价
  const coachPriceKeys = monthLessons
    .filter(l => l.course.club)
    .map(l => ({
      clubId: l.course.club!.id,
      coachId: l.course.coach.id,
      subjectId: l.course.subject.id,
      teachingMode: l.course.teachingMode,
    }))

  const coachPrices = await prisma.coachPrice.findMany({
    where: {
      OR: coachPriceKeys.map(key => ({
        clubId: key.clubId,
        coachId: key.coachId,
        subjectId: key.subjectId,
        teachingMode: key.teachingMode,
      })),
    },
  })

  // 构建定价映射
  const priceMap = new Map<string, number>()
  for (const cp of coachPrices) {
    const key = `${cp.clubId}-${cp.coachId}-${cp.subjectId}-${cp.teachingMode}`
    priceMap.set(key, Number(cp.price))
  }

  // 计算收入
  let monthIncome = 0
  for (const lesson of monthLessons) {
    const duration = lesson.durationMinutes || 0
    const standardDuration = lesson.course.subject.durationMinutes || 60

    // 私人课程（无俱乐部）不计入收入统计
    if (!lesson.course.club) continue

    const priceKey = `${lesson.course.club.id}-${lesson.course.coach.id}-${lesson.course.subject.id}-${lesson.course.teachingMode}`
    const price = priceMap.get(priceKey) || 0

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
