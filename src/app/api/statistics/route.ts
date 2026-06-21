import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取统计数据
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'month'

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

  // 总课时数
  const totalLessons = await prisma.lesson.count({
    where: {
      createdAt: { gte: startDate },
      status: 'confirmed',
    },
  })

  // 总时长
  const durationResult = await prisma.lesson.aggregate({
    where: {
      createdAt: { gte: startDate },
      status: 'confirmed',
    },
    _sum: { durationMinutes: true },
  })
  const totalMinutes = durationResult._sum.durationMinutes || 0

  // 活跃学员数
  const activeStudents = await prisma.lesson.groupBy({
    by: ['studentId'],
    where: {
      createdAt: { gte: startDate },
      status: 'confirmed',
    },
  })

  // 教练排名
  const coachStats = await prisma.lesson.groupBy({
    by: ['coachId'],
    where: {
      createdAt: { gte: startDate },
      status: 'confirmed',
    },
    _count: { id: true },
    _sum: { durationMinutes: true },
  })

  const coachRanking = await Promise.all(
    coachStats
      .sort((a, b) => (b._count.id || 0) - (a._count.id || 0))
      .slice(0, 10)
      .map(async (stat, index) => {
        const coach = await prisma.user.findUnique({
          where: { id: stat.coachId },
          select: { name: true },
        })

        // 统计该教练的学员数
        const studentCount = await prisma.lesson.groupBy({
          by: ['studentId'],
          where: {
            coachId: stat.coachId,
            createdAt: { gte: startDate },
            status: 'confirmed',
          },
        })

        return {
          rank: index + 1,
          name: coach?.name || '未知',
          lessons: stat._count.id,
          hours: Math.round(((stat._sum.durationMinutes || 0) / 60) * 10) / 10,
          students: studentCount.length,
        }
      })
  )

  // 月度趋势（最近6个月）
  const monthlyTrend = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

    const count = await prisma.lesson.count({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        status: 'confirmed',
      },
    })

    monthlyTrend.push({
      name: `${monthStart.getMonth() + 1}月`,
      课时: count,
    })
  }

  // 科目分布
  const subjectStats = await prisma.lesson.groupBy({
    by: ['courseId'],
    where: {
      createdAt: { gte: startDate },
      status: 'confirmed',
    },
  })

  const subjectDistribution: Record<string, number> = {}
  for (const stat of subjectStats) {
    const course = await prisma.course.findUnique({
      where: { id: stat.courseId },
      include: { subject: { select: { name: true } } },
    })
    if (course) {
      const name = course.subject.name
      subjectDistribution[name] = (subjectDistribution[name] || 0) + 1
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
    where: {
      createdAt: { gte: startDate },
      status: 'confirmed',
    },
    include: {
      course: {
        include: {
          subject: { select: { id: true, durationMinutes: true } },
          coach: { select: { id: true } },
        },
      },
    },
  })
  let monthIncome = 0
  for (const lesson of monthLessons) {
    const duration = lesson.durationMinutes || 0
    const standardDuration = lesson.course.subject.durationMinutes || 60

    // 从 CoachPrice 表查找价格（教练+科目+授课模式）
    const coachPrice = await prisma.coachPrice.findUnique({
      where: {
        coachId_subjectId_teachingMode: {
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
    monthlyTrend,
    subjectData,
  })
}
