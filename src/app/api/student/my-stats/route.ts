import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/student/my-stats - 获取学员的统计数据
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'month' // week/month/quarter/year

  // 获取学员信息
  let studentIds: number[] = []

  if (authUser.role === 'student') {
    const student = await prisma.student.findFirst({
      where: { userId: authUser.userId },
    })
    if (!student) {
      return NextResponse.json({ error: '学员信息不存在' }, { status: 404 })
    }
    studentIds = [student.id]
  } else if (authUser.role === 'parent') {
    const students = await prisma.student.findMany({
      where: { parentId: authUser.userId },
    })
    studentIds = students.map(s => s.id)
  } else {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  if (studentIds.length === 0) {
    return NextResponse.json({
      totalLessons: 0,
      totalMinutes: 0,
      completedLessons: 0,
      pendingLessons: 0,
      subjectStats: [],
      monthlyTrend: [],
    })
  }

  // 计算时间范围
  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
      break
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      startDate = new Date(now.getFullYear(), quarter * 3, 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'month':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  // 查询统计数据
  const [totalLessons, totalMinutesResult, completedLessons, pendingLessons] = await Promise.all([
    prisma.lesson.count({
      where: {
        studentId: { in: studentIds },
        createdAt: { gte: startDate },
      },
    }),
    prisma.lesson.aggregate({
      where: {
        studentId: { in: studentIds },
        createdAt: { gte: startDate },
      },
      _sum: {
        durationMinutes: true,
      },
    }),
    prisma.lesson.count({
      where: {
        studentId: { in: studentIds },
        status: 'confirmed',
        createdAt: { gte: startDate },
      },
    }),
    prisma.lesson.count({
      where: {
        studentId: { in: studentIds },
        status: 'pending',
        createdAt: { gte: startDate },
      },
    }),
  ])

  // 科目分布统计
  const subjectStats = await prisma.lesson.groupBy({
    by: ['courseId'],
    where: {
      studentId: { in: studentIds },
      createdAt: { gte: startDate },
    },
    _count: {
      id: true,
    },
  })

  // 获取课程对应的科目信息
  const courseIds = subjectStats.map(s => s.courseId)
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    include: { subject: true },
  })

  const courseSubjectMap = new Map(courses.map(c => [c.id, c.subject]))

  // 按科目汇总
  const subjectSummary: { [key: string]: { name: string; count: number } } = {}
  subjectStats.forEach(stat => {
    const subject = courseSubjectMap.get(stat.courseId)
    if (subject) {
      if (!subjectSummary[subject.id]) {
        subjectSummary[subject.id] = { name: subject.name, count: 0 }
      }
      subjectSummary[subject.id].count += stat._count.id
    }
  })

  // 月度趋势（最近6个月）
  const monthlyTrend = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

    const count = await prisma.lesson.count({
      where: {
        studentId: { in: studentIds },
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    })

    monthlyTrend.push({
      month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
      count,
    })
  }

  return NextResponse.json({
    totalLessons,
    totalMinutes: totalMinutesResult._sum.durationMinutes || 0,
    completedLessons,
    pendingLessons,
    subjectStats: Object.values(subjectSummary),
    monthlyTrend,
  })
}
