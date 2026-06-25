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
  const all = searchParams.get('all') === 'true' // 管理页面用，不限50条

  const where: any = {
    userId: authUser.userId,
  }

  if (unreadOnly) {
    where.isRead = false
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: all ? undefined : 50,
  })

  return NextResponse.json(notifications)
}

// DELETE /api/notifications - 批量删除通知
export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids')

  if (idsParam) {
    // 删除指定通知
    const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n))
    if (ids.length === 0) {
      return NextResponse.json({ error: '无效的通知ID' }, { status: 400 })
    }
    await prisma.notification.deleteMany({
      where: {
        id: { in: ids },
        userId: authUser.userId,
      },
    })
  } else {
    // 删除所有已读通知
    await prisma.notification.deleteMany({
      where: {
        userId: authUser.userId,
        isRead: true,
      },
    })
  }

  return NextResponse.json({ success: true })
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
