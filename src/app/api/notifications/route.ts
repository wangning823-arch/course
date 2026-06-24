import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/notifications - 获取通知列表
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unreadOnly') === 'true'

  const where: any = {
    userId: authUser.userId,
  }

  if (unreadOnly) {
    where.isRead = false
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(notifications)
}

// PUT /api/notifications/read-all - 全部标记已读
export async function PUT(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  await prisma.notification.updateMany({
    where: {
      userId: authUser.userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  })

  return NextResponse.json({ success: true })
}
