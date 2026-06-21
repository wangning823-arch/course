import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import crypto from 'crypto'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// PUT - 更新用户
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = parseInt(id)
  const { name, phone, role, status, password, oldPassword } = await request.json()

  const authUser = await getAuthUser(request)

  // 俱乐部管理员只能编辑自己俱乐部的用户
  if (authUser?.role === 'club_admin') {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, memberships: { select: { clubId: true } } },
    })
    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    // 不能编辑超级管理员
    if (targetUser.role === 'super_admin') {
      return NextResponse.json({ error: '无权编辑系统管理员' }, { status: 403 })
    }
    // 不能修改角色为 super_admin
    if (role === 'super_admin') {
      return NextResponse.json({ error: '无权将用户提升为系统管理员' }, { status: 403 })
    }
    // 检查目标用户是否属于自己的俱乐部
    const inClub = targetUser.memberships.some(m => m.clubId === authUser.clubId)
    if (!inClub) {
      return NextResponse.json({ error: '无权编辑其他俱乐部的用户' }, { status: 403 })
    }
  }

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone
  if (role !== undefined) updateData.role = role
  if (status !== undefined) updateData.status = status

  // 修改密码
  if (password) {
    if (oldPassword) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 })
      }
      const hashedOld = hashPassword(oldPassword)
      if (user.passwordHash !== hashedOld) {
        return NextResponse.json({ error: '原密码错误' }, { status: 400 })
      }
    }
    updateData.passwordHash = hashPassword(password)
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  })

  return NextResponse.json(user)
}

// DELETE - 删除用户
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = parseInt(id)

  const authUser = await getAuthUser(request)

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, memberships: { select: { clubId: true } } },
  })
  if (!targetUser) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  // 不能删除系统管理员
  if (targetUser.role === 'super_admin') {
    return NextResponse.json({ error: '不能删除系统管理员' }, { status: 403 })
  }

  // 俱乐部管理员只能删除自己俱乐部的用户
  if (authUser?.role === 'club_admin') {
    const inClub = targetUser.memberships.some(m => m.clubId === authUser.clubId)
    if (!inClub) {
      return NextResponse.json({ error: '无权删除其他俱乐部的用户' }, { status: 403 })
    }
  }

  // 用事务按正确顺序清理关联记录
  await prisma.$transaction(async (tx) => {
    // 1. 先解除该用户确认过的课时的外键（confirmedById → User）
    await tx.lesson.updateMany({ where: { confirmedById: userId }, data: { confirmedById: null } })

    // 2. 结算明细依赖课时，先删结算明细
    const lessonsAsCoach = await tx.lesson.findMany({ where: { coachId: userId }, select: { id: true } })
    const lessonIds = lessonsAsCoach.map(l => l.id)
    if (lessonIds.length > 0) {
      await tx.settlementItem.deleteMany({ where: { lessonId: { in: lessonIds } } })
    }
    // 3. 删除该用户作为教练的课时记录
    await tx.lesson.deleteMany({ where: { coachId: userId } })

    // 4. 处理该用户创建或执教的课程
    const courses = await tx.course.findMany({ where: { OR: [{ coachId: userId }, { createdBy: userId }] }, select: { id: true } })
    const courseIds = courses.map(c => c.id)
    if (courseIds.length > 0) {
      // 先清理这些课程下的课时中该用户确认过的记录
      await tx.lesson.updateMany({ where: { courseId: { in: courseIds }, confirmedById: userId }, data: { confirmedById: null } })
      await tx.courseStudent.deleteMany({ where: { courseId: { in: courseIds } } })
      await tx.lesson.deleteMany({ where: { courseId: { in: courseIds } } })
      await tx.course.deleteMany({ where: { id: { in: courseIds } } })
    }

    // 5. 清理其他关联
    await tx.coachPrice.deleteMany({ where: { coachId: userId } })
    await tx.clubMember.deleteMany({ where: { userId } })

    // 6. 解除学员和俱乐部的关联
    await tx.student.updateMany({ where: { coachId: userId }, data: { coachId: null } })
    await tx.club.updateMany({ where: { adminId: userId }, data: { adminId: null } })

    // 7. 最后删除用户
    await tx.user.delete({ where: { id: userId } })
  })

  return NextResponse.json({ success: true })
}
