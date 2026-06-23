import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET - 获取单条反馈详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseInt(idStr)

  // 获取当前用户
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, phone: true },
      },
      repliedBy: {
        select: { id: true, name: true },
      },
    },
  })

  if (!feedback) {
    return NextResponse.json({ error: '反馈不存在' }, { status: 404 })
  }

  // 非管理员只能查看自己的反馈
  if (authUser.role !== 'super_admin' && feedback.userId !== authUser.userId) {
    return NextResponse.json({ error: '无权查看' }, { status: 403 })
  }

  return NextResponse.json(feedback)
}

// PUT - 更新反馈（仅管理员）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  const { status, reply } = await request.json()

  // 获取当前用户
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  // 仅管理员可以更新
  if (authUser.role !== 'super_admin') {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id },
  })

  if (!feedback) {
    return NextResponse.json({ error: '反馈不存在' }, { status: 404 })
  }

  const updateData: any = {}

  if (status) {
    updateData.status = status
  }

  if (reply !== undefined) {
    updateData.reply = reply
    updateData.repliedAt = new Date()
    updateData.repliedById = authUser.userId
  }

  const updated = await prisma.feedback.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: { id: true, name: true, phone: true },
      },
      repliedBy: {
        select: { id: true, name: true },
      },
    },
  })

  return NextResponse.json(updated)
}

// DELETE - 删除反馈（仅管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseInt(idStr)

  // 获取当前用户
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  // 仅管理员可以删除
  if (authUser.role !== 'super_admin') {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id },
  })

  if (!feedback) {
    return NextResponse.json({ error: '反馈不存在' }, { status: 404 })
  }

  await prisma.feedback.delete({
    where: { id },
  })

  return NextResponse.json({ message: '删除成功' })
}
