import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT - 更新课程
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, remark, location } = await request.json()

  // 如果状态变为取消，同时取消关联的预约
  if (status === 'cancelled') {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
    })
    if (course) {
      const associatedBooking = await prisma.booking.findFirst({
        where: {
          coachId: course.coachId,
          date: course.scheduledDate,
          startTime: course.startTime,
          endTime: course.endTime,
          status: { notIn: ['cancelled', 'rejected'] },
        },
      })
      if (associatedBooking) {
        await prisma.booking.update({
          where: { id: associatedBooking.id },
          data: { status: 'cancelled' },
        })
      }
    }
  }

  const course = await prisma.course.update({
    where: { id: parseInt(id) },
    data: { status, remark, location },
  })

  return NextResponse.json(course)
}

// DELETE - 删除课程（取消）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  // 只有教练和管理员可以取消课程
  if (!['full_time_coach', 'part_time_coach', 'club_admin', 'super_admin'].includes(authUser.role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await params

  // 查找课程信息
  const course = await prisma.course.findUnique({
    where: { id: parseInt(id) },
    include: {
      subject: { select: { name: true } },
      coach: { select: { name: true } },
      students: {
        include: {
          student: {
            include: {
              user: true,   // 成年学员
              parent: true, // 学员家长
            },
          },
        },
      },
    },
  })

  if (!course) {
    return NextResponse.json({ error: '课程不存在' }, { status: 404 })
  }

  // 检查权限：教练只能取消自己的课程
  if (['full_time_coach', 'part_time_coach'].includes(authUser.role) && course.coachId !== authUser.userId) {
    return NextResponse.json({ error: '无权取消该课程' }, { status: 403 })
  }

  // 软删除：改为取消状态
  await prisma.course.update({
    where: { id: parseInt(id) },
    data: { status: 'cancelled' },
  })

  // 同时取消关联的预约（通过教练、日期、时间匹配）
  const associatedBooking = await prisma.booking.findFirst({
    where: {
      coachId: course.coachId,
      date: course.scheduledDate,
      startTime: course.startTime,
      endTime: course.endTime,
      status: { notIn: ['cancelled', 'rejected'] },
    },
  })
  if (associatedBooking) {
    await prisma.booking.update({
      where: { id: associatedBooking.id },
      data: { status: 'cancelled' },
    })
  }

  // 只有未完成的课程才发送通知
  if (course.status === 'scheduled' || course.status === 'in_progress') {
    // 格式化日期
    const courseDate = new Date(course.scheduledDate)
    const dateStr = `${courseDate.getFullYear()}-${String(courseDate.getMonth() + 1).padStart(2, '0')}-${String(courseDate.getDate()).padStart(2, '0')}`

    // 给每个学员或学员家长发通知
    const notifiedUsers = new Set<number>() // 避免重复通知

    for (const cs of course.students) {
      const student = cs.student
      let notifyUserId: number | null = null

      // 优先通知家长（未成年学员）
      if (student.parentId && student.parent) {
        notifyUserId = student.parentId
      }
      // 其次通知成年学员自己
      else if (student.userId && student.user) {
        notifyUserId = student.userId
      }

      // 避免重复通知同一用户
      if (notifyUserId && !notifiedUsers.has(notifyUserId)) {
        notifiedUsers.add(notifyUserId)
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            type: 'booking_cancelled',
            title: '课程已取消',
            content: `教练 ${course.coach.name} 取消了 ${dateStr} ${course.startTime}-${course.endTime} 的${course.subject.name}课程`,
            relatedId: course.id,
          },
        })
      }
    }
  }

  return NextResponse.json({ success: true })
}
