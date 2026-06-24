import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT - 更新学员
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, phone, gender, parentName, parentPhone, remark, status, coachId } = await request.json()

  // 验证权限
  const authUser = await getAuthUser(request)
  const existingStudent = await prisma.student.findUnique({ where: { id: parseInt(id) }, select: { clubId: true, coachId: true } })
  if (!existingStudent) return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  if (authUser?.role === 'club_admin') {
    if (existingStudent.clubId !== authUser.clubId) {
      return NextResponse.json({ error: '无权修改其他俱乐部的学员' }, { status: 403 })
    }
  } else if (authUser?.role === 'part_time_coach') {
    // 兼职教练只能编辑自己的私有学员
    if (existingStudent.coachId !== authUser.userId) {
      return NextResponse.json({ error: '无权修改其他教练的学员' }, { status: 403 })
    }
  }

  const updatedStudent = await prisma.student.update({
    where: { id: parseInt(id) },
    data: {
      name,
      phone,
      gender,
      parentName,
      parentPhone,
      remark,
      status,
      coachId: coachId !== undefined ? (coachId ? parseInt(coachId) : null) : undefined,
    },
  })

  return NextResponse.json(updatedStudent)
}

// DELETE - 删除学员
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const studentId = parseInt(id)

  // 验证权限
  const authUser = await getAuthUser(request)
  const existingStudent = await prisma.student.findUnique({
    where: { id: studentId },
    select: { clubId: true, coachId: true, userId: true, parentId: true },
  })
  if (!existingStudent) return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  if (authUser?.role === 'club_admin') {
    if (existingStudent.clubId !== authUser.clubId) {
      return NextResponse.json({ error: '无权删除其他俱乐部的学员' }, { status: 403 })
    }
  } else if (authUser?.role === 'part_time_coach') {
    // 兼职教练只能删除自己的私有学员
    if (existingStudent.coachId !== authUser.userId) {
      return NextResponse.json({ error: '无权删除其他教练的学员' }, { status: 403 })
    }
  }

  // 检查是否有课程关联
  const courseCount = await prisma.courseStudent.count({ where: { studentId } })
  if (courseCount > 0) {
    return NextResponse.json({ error: '该学员有关联课程，无法删除' }, { status: 400 })
  }

  // 检查是否有课时记录
  const lessonCount = await prisma.lesson.count({ where: { studentId } })
  if (lessonCount > 0) {
    return NextResponse.json({ error: '该学员有课时记录，无法删除' }, { status: 400 })
  }

  // 检查是否有预约记录
  const bookingCount = await prisma.booking.count({ where: { studentId } })
  if (bookingCount > 0) {
    return NextResponse.json({ error: '该学员有预约记录，无法删除' }, { status: 400 })
  }

  // 删除学员记录
  await prisma.student.delete({ where: { id: studentId } })

  // 如果有关联的用户账号，检查是否可以删除
  // 成年学员的 userId 或未成年学员的 parentId
  const userToDelete = existingStudent.userId || existingStudent.parentId
  if (userToDelete) {
    // 检查该用户是否还是其他学员的关联用户
    const otherStudentAsUser = await prisma.student.count({
      where: { userId: userToDelete, id: { not: studentId } },
    })
    const otherStudentAsParent = await prisma.student.count({
      where: { parentId: userToDelete, id: { not: studentId } },
    })
    // 检查该用户是否是教练或管理员
    const user = await prisma.user.findUnique({ where: { id: userToDelete }, select: { role: true } })
    const isNonStudentUser = user && ['super_admin', 'club_admin', 'full_time_coach', 'part_time_coach'].includes(user.role)

    // 如果该用户只关联了这一个学员，且不是教练/管理员，则删除用户
    if (otherStudentAsUser === 0 && otherStudentAsParent === 0 && !isNonStudentUser) {
      await prisma.user.delete({ where: { id: userToDelete } })
    }
  }

  return NextResponse.json({ success: true })
}
