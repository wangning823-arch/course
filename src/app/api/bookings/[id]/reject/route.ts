import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT /api/bookings/[id]/reject - 拒绝预约
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 只有教练和管理员可以拒绝预约
    if (!['full_time_coach', 'part_time_coach', 'club_admin', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params
    const bookingId = parseInt(id)

    let reason = ''
    try {
      const body = await request.json()
      reason = body.reason || ''
    } catch {
      return NextResponse.json({ error: '请求参数错误' }, { status: 400 })
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: '请填写拒绝原因' }, { status: 400 })
    }

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
      return NextResponse.json({ error: '该预约无法拒绝' }, { status: 400 })
    }

    // 检查权限：教练只能拒绝自己的预约
    if (['full_time_coach', 'part_time_coach'].includes(authUser.role) && booking.coachId !== authUser.userId) {
      return NextResponse.json({ error: '无权拒绝该预约' }, { status: 403 })
    }

    // 更新预约状态
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'rejected',
        rejectReason: reason.trim(),
      },
      include: {
        student: true,
        coach: { select: { id: true, name: true } },
        subject: true,
      },
    })

    // 发送通知给发起人，包含拒绝原因
    try {
      const coachName = booking.coach?.name || '教练'
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          type: 'booking_rejected',
          title: '预约已拒绝',
          content: `教练 ${coachName} 拒绝了您的预约，原因：${reason.trim()}`,
          relatedId: booking.id,
        },
      })
    } catch (e) {
      console.error('发送拒绝通知失败:', e)
    }

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error('拒绝预约API错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
