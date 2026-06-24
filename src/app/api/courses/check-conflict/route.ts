import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/courses/check-conflict - 检查教练时间冲突
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const coachId = searchParams.get('coachId')
  const date = searchParams.get('date')
  const startTime = searchParams.get('startTime')
  const endTime = searchParams.get('endTime')

  if (!coachId || !date || !startTime || !endTime) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 })
  }

  // 检查该教练在指定时间段是否已有课程
  const conflictingCourse = await prisma.course.findFirst({
    where: {
      coachId: parseInt(coachId),
      scheduledDate: date,
      status: { not: 'cancelled' },
      // 时间重叠条件: 新课程开始时间 < 已有课程结束时间 AND 新课程结束时间 > 已有课程开始时间
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: {
      id: true,
      subject: { select: { name: true } },
      startTime: true,
      endTime: true,
    },
  })

  // 同时检查是否有待确认的预约（未取消/未拒绝的）
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      coachId: parseInt(coachId),
      date: new Date(date),
      status: { notIn: ['cancelled', 'rejected'] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: {
      id: true,
      subject: { select: { name: true } },
      startTime: true,
      endTime: true,
    },
  })

  // 优先返回课程冲突，其次返回预约冲突
  const hasConflict = !!conflictingCourse || !!conflictingBooking
  const conflictInfo = conflictingCourse || conflictingBooking || null

  return NextResponse.json({
    hasConflict,
    conflictCourse: conflictInfo,
  })
}
