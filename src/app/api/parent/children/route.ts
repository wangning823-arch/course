import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/parent/children - 获取家长管理的学员列表
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  if (authUser.role !== 'parent') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  // 获取家长管理的学员（自动匹配）
  const children = await prisma.student.findMany({
    where: {
      parentId: authUser.userId,
    },
    include: {
      club: { select: { id: true, name: true } },
      coach: { select: { id: true, name: true } },
    },
  })

  // 同时查找 parentPhone 匹配但未关联的学员
  const unlinkedStudents = await prisma.student.findMany({
    where: {
      parentPhone: authUser.phone,
      parentId: null,
    },
    include: {
      club: { select: { id: true, name: true } },
      coach: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({
    linked: children,
    unlinked: unlinkedStudents,
  })
}

// POST /api/parent/children - 关联学员
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  if (authUser.role !== 'parent') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { studentId } = await request.json()

  if (!studentId) {
    return NextResponse.json({ error: '请提供学员ID' }, { status: 400 })
  }

  // 查找学员
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  })

  if (!student) {
    return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  }

  // 检查是否已经是自己的孩子
  if (student.parentId === authUser.userId) {
    return NextResponse.json({ error: '该学员已经是您的孩子' }, { status: 400 })
  }

  // 检查是否有权限关联（通过手机号匹配）
  if (student.parentPhone !== authUser.phone) {
    return NextResponse.json({ error: '无权关联该学员' }, { status: 403 })
  }

  // 关联学员
  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: { parentId: authUser.userId },
  })

  return NextResponse.json(updatedStudent)
}
