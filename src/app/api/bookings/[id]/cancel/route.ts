import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT /api/bookings/[id]/cancel - 取消预约
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
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

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: '该预约已取消' }, { status: 400 })
  }

  // 检查权限：学员/家长可以取消自己的预约，教练/管理员可以取消相关预约
  const canCancel =
    booking.userId === authUser.userId ||
    booking.coachId === authUser.userId ||
    ['club_admin', 'super_admin'].includes(authUser.role)

  if (!canCancel) {
    return NextResponse.json({ error: '无权取消该预约' }, { status: 403 })
  }

  // 更新预约状态
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'cancelled' },
    include: {
      student: true,
      coach: { select: { id: true, name: true } },
      subject: true,
    },
  })

  // 发送通知
  const notifyUserId = booking.userId === authUser.userId ? booking.coachId : booking.userId
  await prisma.notification.create({
    data: {
      userId: notifyUserId,
      type: 'booking_cancelled',
      title: '预约已取消',
      content: `预约已被取消`,
      relatedId: booking.id,
    },
  })

  return NextResponse.json(updatedBooking)
}
