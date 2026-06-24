import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/student/my-courses - 获取学员的课程列表
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  // 获取学员信息
  let studentId: number | null = null

  if (authUser.role === 'student') {
    // 成年学员：通过 userId 查找 Student
    const student = await prisma.student.findFirst({
      where: { userId: authUser.userId },
    })
    if (!student) {
      return NextResponse.json({ error: '学员信息不存在' }, { status: 404 })
    }
    studentId = student.id
  } else if (authUser.role === 'parent') {
    // 家长：查找管理的学员（如果有多个，返回所有）
    const students = await prisma.student.findMany({
      where: { parentId: authUser.userId },
    })
    if (students.length === 0) {
      return NextResponse.json([])
    }
    // 返回所有孩子的课程
    const studentIds = students.map(s => s.id)
    const courses = await prisma.course.findMany({
      where: {
        students: {
          some: {
            studentId: { in: studentIds },
          },
        },
      },
      include: {
        subject: true,
        coach: { select: { id: true, name: true } },
        students: {
          include: {
            student: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    })
    return NextResponse.json(courses)
  } else {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  // 学员的课程
  const courses = await prisma.course.findMany({
    where: {
      students: {
        some: {
          studentId,
        },
      },
    },
    include: {
      subject: true,
      coach: { select: { id: true, name: true } },
      students: {
        include: {
          student: true,
        },
      },
    },
    orderBy: { scheduledDate: 'desc' },
  })

  return NextResponse.json(courses)
}
