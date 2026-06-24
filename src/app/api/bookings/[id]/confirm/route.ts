import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT /api/bookings/[id]/confirm - 确认预约
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  // 只有教练和管理员可以确认预约
  if (!['full_time_coach', 'part_time_coach', 'club_admin', 'super_admin'].includes(authUser.role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await params
  const bookingId = parseInt(id)

  // 查找预约
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: true,
      coach: { select: { id: true, name: true } },
    },
  })

  if (!booking) {
    return NextResponse.json({ error: '预约不存在' }, { status: 404 })
  }

  if (booking.status !== 'pending') {
    return NextResponse.json({ error: '该预约无法确认' }, { status: 400 })
  }

  // 检查权限：教练只能确认自己的预约
  if (['full_time_coach', 'part_time_coach'].includes(authUser.role) && booking.coachId !== authUser.userId) {
    return NextResponse.json({ error: '无权确认该预约' }, { status: 403 })
  }

  // 更新预约状态
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'confirmed' },
    include: {
      student: true,
      coach: { select: { id: true, name: true } },
      subject: true,
    },
  })

  // 发送通知给发起人
  await prisma.notification.create({
    data: {
      userId: booking.userId,
      type: 'booking_confirmed',
      title: '预约已确认',
      content: `教练 ${booking.coach.name} 已确认您的预约`,
      relatedId: booking.id,
    },
  })

  return NextResponse.json(updatedBooking)
}
