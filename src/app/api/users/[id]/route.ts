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

// DELETE - 删除用户（多俱乐部用户只移除关联，单俱乐部用户彻底删除）
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

  // 俱乐部管理员只能操作自己俱乐部的用户
  if (authUser?.role === 'club_admin') {
    const inClub = targetUser.memberships.some(m => m.clubId === authUser.clubId)
    if (!inClub) {
      return NextResponse.json({ error: '无权删除其他俱乐部的用户' }, { status: 403 })
    }
  }

  // 确定要移除哪些俱乐部关联
  // super_admin: 移除所有关联并彻底删除
  // club_admin: 只移除自己俱乐部的关联
  const isSuperAdmin = authUser?.role === 'super_admin'
  const clubIdsToRemove = isSuperAdmin
    ? targetUser.memberships.map(m => m.clubId)
    : targetUser.memberships
        .filter(m => m.clubId === authUser!.clubId)
        .map(m => m.clubId)

  const remainingMemberships = targetUser.memberships.length - clubIdsToRemove.length

  await prisma.$transaction(async (tx) => {
    // 1. 先解除该用户确认过的课时的外键（confirmedById → User）
    await tx.lesson.updateMany({ where: { confirmedById: userId }, data: { confirmedById: null } })

    // 2. 处理要移除的俱乐部下的课程和课时
    if (clubIdsToRemove.length > 0) {
      // 找出这些俱乐部下的课程
      const courses = await tx.course.findMany({
        where: { clubId: { in: clubIdsToRemove }, OR: [{ coachId: userId }, { createdBy: userId }] },
        select: { id: true },
      })
      const courseIds = courses.map(c => c.id)
      if (courseIds.length > 0) {
        // 清理课程关联的课时
        const lessons = await tx.lesson.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } })
        const lessonIds = lessons.map(l => l.id)
        if (lessonIds.length > 0) {
          await tx.settlementItem.deleteMany({ where: { lessonId: { in: lessonIds } } })
        }
        await tx.lesson.deleteMany({ where: { courseId: { in: courseIds } } })
        await tx.courseStudent.deleteMany({ where: { courseId: { in: courseIds } } })
        await tx.course.deleteMany({ where: { id: { in: courseIds } } })
      }

      // 删除该用户在这些俱乐部的教练定价
      await tx.coachPrice.deleteMany({ where: { coachId: userId, clubId: { in: clubIdsToRemove } } })

      // 解除这些俱乐部中该用户负责的学员
      await tx.student.updateMany({
        where: { coachId: userId, clubId: { in: clubIdsToRemove } },
        data: { coachId: null },
      })

      // 解除这些俱乐部的 adminId
      await tx.club.updateMany({
        where: { adminId: userId, id: { in: clubIdsToRemove } },
        data: { adminId: null },
      })
    }

    // 3. 移除俱乐部关联
    await tx.clubMember.deleteMany({ where: { userId, clubId: { in: clubIdsToRemove } } })

    // 4. 如果没有剩余关联，彻底删除用户
    if (remainingMemberships <= 0) {
      // 清理剩余的教练课时（其他俱乐部的）
      const remainingLessons = await tx.lesson.findMany({ where: { coachId: userId }, select: { id: true } })
      const remainingLessonIds = remainingLessons.map(l => l.id)
      if (remainingLessonIds.length > 0) {
        await tx.settlementItem.deleteMany({ where: { lessonId: { in: remainingLessonIds } } })
      }
      await tx.lesson.deleteMany({ where: { coachId: userId } })

      // 清理剩余课程
      const remainingCourses = await tx.course.findMany({
        where: { OR: [{ coachId: userId }, { createdBy: userId }] },
        select: { id: true },
      })
      const remainingCourseIds = remainingCourses.map(c => c.id)
      if (remainingCourseIds.length > 0) {
        await tx.courseStudent.deleteMany({ where: { courseId: { in: remainingCourseIds } } })
        await tx.lesson.deleteMany({ where: { courseId: { in: remainingCourseIds } } })
        await tx.course.deleteMany({ where: { id: { in: remainingCourseIds } } })
      }

      await tx.coachPrice.deleteMany({ where: { coachId: userId } })
      await tx.clubMember.deleteMany({ where: { userId } })
      await tx.student.updateMany({ where: { coachId: userId }, data: { coachId: null } })
      await tx.club.updateMany({ where: { adminId: userId }, data: { adminId: null } })
      await tx.user.delete({ where: { id: userId } })
    }
  })

  const message = remainingMemberships > 0
    ? `已从当前俱乐部移除，该用户仍属于 ${remainingMemberships} 个其他俱乐部`
    : '用户已彻底删除'

  return NextResponse.json({ success: true, message })
}
