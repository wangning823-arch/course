import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/student/my-lessons - 获取学员的课时记录
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

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
    return NextResponse.json({ lessons: [], total: 0 })
  }

  // 查询课时记录
  const [lessons, total] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        studentId: { in: studentIds },
      },
      include: {
        course: {
          include: {
            subject: true,
          },
        },
        student: true,
        coach: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.lesson.count({
      where: {
        studentId: { in: studentIds },
      },
    }),
  ])

  return NextResponse.json({
    lessons,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}
