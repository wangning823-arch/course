import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT /api/notifications/[id]/read - 标记通知已读
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { id } = await params
  const notificationId = parseInt(id)

  // 查找通知
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification) {
    return NextResponse.json({ error: '通知不存在' }, { status: 404 })
  }

  // 检查权限
  if (notification.userId !== authUser.userId) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  // 标记已读
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
