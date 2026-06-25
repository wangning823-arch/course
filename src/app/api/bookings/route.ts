import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/bookings - 获取预约列表
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const clubId = searchParams.get('clubId')

  let where: any = {}

  // 根据角色过滤
  if (authUser.role === 'student') {
    // 学员：看自己的预约 + 自己孩子的预约（学员家长）
    const selfStudent = await prisma.student.findFirst({
      where: { userId: authUser.userId },
    })
    const childStudents = await prisma.student.findMany({
      where: { parentId: authUser.userId },
    })
    const studentIds = [selfStudent?.id, ...childStudents.map(s => s.id)].filter(Boolean) as number[]
    if (studentIds.length === 0) {
      return NextResponse.json([])
    }
    where.studentId = { in: studentIds }
  } else if (authUser.role === 'parent') {
    // 家长：看自己孩子的预约
    const students = await prisma.student.findMany({
      where: { parentId: authUser.userId },
    })
    where.studentId = { in: students.map(s => s.id) }
  } else if (authUser.role === 'full_time_coach' || authUser.role === 'part_time_coach') {
    // 教练：看自己收到的预约
    where.coachId = authUser.userId
  } else if (authUser.role === 'club_admin') {
    // 管理员：看俱乐部的所有预约
    if (clubId) {
      where.clubId = parseInt(clubId)
    }
  }

  // 状态过滤
  if (status && status !== 'all') {
    where.status = status
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      student: true,
      coach: { select: { id: true, name: true } },
      subject: true,
      user: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(bookings)
}

// POST /api/bookings - 创建预约
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  // 只有学员和家长可以创建预约
  if (!['student', 'parent'].includes(authUser.role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { clubId, coachId, subjectId, date, startTime, endTime, remark, studentId: requestedStudentId } = await request.json()

  if (!clubId || !coachId || !date || !startTime || !endTime) {
    return NextResponse.json({ error: '请填写完整的预约信息' }, { status: 400 })
  }

  // 获取学员信息
  let studentId: number | null = null
  if (authUser.role === 'student') {
    if (requestedStudentId) {
      // 学员家长为孩子预约：验证该学员的 parentId 是当前用户
      const student = await prisma.student.findFirst({
        where: {
          id: requestedStudentId,
          parentId: authUser.userId,
        },
      })
      if (!student) {
        // 不是自己的孩子，检查是否是自己
        const selfStudent = await prisma.student.findFirst({
          where: { userId: authUser.userId },
        })
        if (!selfStudent || selfStudent.id !== requestedStudentId) {
          return NextResponse.json({ error: '学员信息不存在' }, { status: 404 })
        }
        studentId = selfStudent.id
      } else {
        studentId = student.id
      }
    } else {
      // 没传 studentId，默认用自己的
      const student = await prisma.student.findFirst({
        where: { userId: authUser.userId },
      })
      if (!student) {
        return NextResponse.json({ error: '学员信息不存在' }, { status: 404 })
      }
      studentId = student.id
    }
  } else {
    // 家长：从请求中获取学员ID
    if (requestedStudentId) {
      const student = await prisma.student.findFirst({
        where: {
          id: requestedStudentId,
          parentId: authUser.userId,
        },
      })
      if (!student) {
        return NextResponse.json({ error: '学员信息不存在' }, { status: 404 })
      }
      studentId = student.id
    } else {
      // 默认选择第一个孩子
      const student = await prisma.student.findFirst({
        where: { parentId: authUser.userId },
      })
      if (!student) {
        return NextResponse.json({ error: '请先添加孩子' }, { status: 400 })
      }
      studentId = student.id
    }
  }

  // 检查时间冲突
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      coachId,
      date: new Date(date),
      status: { notIn: ['cancelled', 'rejected'] },
      OR: [
        { startTime: { lt: endTime }, endTime: { gt: startTime } },
      ],
    },
  })

  if (conflictingBooking) {
    return NextResponse.json({ error: '该时间段教练已有预约' }, { status: 400 })
  }

  // 创建预约
  const booking = await prisma.booking.create({
    data: {
      clubId,
      studentId: studentId!,
      coachId,
      subjectId: subjectId || null,
      userId: authUser.userId,
      date: new Date(date),
      startTime,
      endTime,
      remark,
    },
    include: {
      student: true,
      coach: { select: { id: true, name: true } },
      subject: true,
    },
  })

  // 发送通知给教练
  await prisma.notification.create({
    data: {
      userId: coachId,
      type: 'booking_new',
      title: '新预约通知',
      content: `学员 ${booking.student.name} 预约了您的课程`,
      relatedId: booking.id,
    },
  })

  // 发送通知给俱乐部管理员
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { adminId: true },
  })
  if (club?.adminId) {
    await prisma.notification.create({
      data: {
        userId: club.adminId,
        type: 'booking_new',
        title: '新预约通知',
        content: `学员 ${booking.student.name} 预约了教练 ${booking.coach.name} 的课程`,
        relatedId: booking.id,
      },
    })
  }

  return NextResponse.json(booking, { status: 201 })
}
