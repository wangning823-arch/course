import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET - 获取反馈列表
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        repliedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: feedbacks })
  } catch (error) {
    console.error('获取反馈列表错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// POST - 创建反馈
export async function POST(request: NextRequest) {
  try {
    const { category, title, content } = await request.json()

    if (!category || !title || !content) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
    }

    // 获取当前用户
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: authUser.userId,
        category,
        title,
        content,
      },
    })

    return NextResponse.json({
      id: feedback.id,
      message: '反馈提交成功',
    })
  } catch (error) {
    console.error('创建反馈错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
