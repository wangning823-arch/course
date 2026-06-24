import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 计算课程时长（分钟）
function courseDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

// GET /api/student/my-stats - 获取学员的统计数据（基于课程而非课时记录）
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'month'
  const specificStudentId = searchParams.get('studentId')

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
    const where: any = { parentId: authUser.userId }
    if (specificStudentId) {
      where.id = parseInt(specificStudentId)
    }
    const students = await prisma.student.findMany({ where })
    studentIds = students.map(s => s.id)
  } else {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  if (studentIds.length === 0) {
    return NextResponse.json({
      totalHours: 0,
      completedHours: 0,
      totalCourseCount: 0,
      completedCourseCount: 0,
      subjectStats: [],
      monthlyTrend: [],
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // 计算时间范围（UTC）
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()
  let startDate: Date

  switch (period) {
    case 'week':
      startDate = new Date(Date.UTC(year, month, day - now.getDay()))
      break
    case 'quarter':
      const quarter = Math.floor(month / 3)
      startDate = new Date(Date.UTC(year, quarter * 3, 1))
      break
    case 'year':
      startDate = new Date(Date.UTC(year, 0, 1))
      break
    case 'month':
    default:
      startDate = new Date(Date.UTC(year, month, 1))
  }

  // 查询该学员在时间范围内的所有课程（含课时记录）
  const courses = await prisma.course.findMany({
    where: {
      status: { not: 'cancelled' },
      scheduledDate: { gte: startDate },
      students: { some: { studentId: { in: studentIds } } },
    },
    include: {
      lessons: { select: { id: true, status: true, durationMinutes: true } },
      subject: { select: { name: true } },
    },
    orderBy: { scheduledDate: 'asc' },
  })

  // 按课程时长计算总课时
  let totalHours = 0
  let completedHours = 0
  let totalCourseCount = 0
  let completedCourseCount = 0

  // 科目统计
  const subjectMap: Record<string, { name: string; count: number; minutes: number }> = {}

  for (const course of courses) {
    const duration = courseDurationMinutes(course.startTime, course.endTime)
    totalHours += duration / 60
    totalCourseCount++

    // 有已确认的课时记录 = 已完成
    const confirmedLesson = course.lessons.find(l => l.status === 'confirmed')
    if (confirmedLesson) {
      completedHours += (confirmedLesson.durationMinutes || duration) / 60
      completedCourseCount++
    }

    // 科目统计
    const subjectName = course.subject?.name || '未知'
    if (!subjectMap[subjectName]) {
      subjectMap[subjectName] = { name: subjectName, count: 0, minutes: 0 }
    }
    subjectMap[subjectName].count++
    subjectMap[subjectName].minutes += duration
  }

  // 月度趋势（最近6个月，基于课程）
  const monthlyTrend = []
  for (let i = 5; i >= 0; i--) {
    const trendMonth = month - i
    const monthStart = new Date(Date.UTC(year, trendMonth, 1))
    const monthEnd = new Date(Date.UTC(year, trendMonth + 1, 0, 23, 59, 59))

    const monthCourses = await prisma.course.findMany({
      where: {
        status: { not: 'cancelled' },
        scheduledDate: { gte: monthStart, lte: monthEnd },
        students: { some: { studentId: { in: studentIds } } },
      },
      select: { startTime: true, endTime: true },
    })

    const monthMinutes = monthCourses.reduce((sum, c) => sum + courseDurationMinutes(c.startTime, c.endTime), 0)

    monthlyTrend.push({
      month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
      hours: parseFloat((monthMinutes / 60).toFixed(1)),
    })
  }

  return NextResponse.json({
    totalHours: parseFloat(totalHours.toFixed(1)),
    completedHours: parseFloat(completedHours.toFixed(1)),
    totalCourseCount,
    completedCourseCount,
    subjectStats: Object.values(subjectMap).map(s => ({
      name: s.name,
      count: s.count,
      hours: parseFloat((s.minutes / 60).toFixed(1)),
    })),
    monthlyTrend,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
