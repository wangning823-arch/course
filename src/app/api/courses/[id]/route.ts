import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - 更新课程
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, remark, location } = await request.json()

  const course = await prisma.course.update({
    where: { id: parseInt(id) },
    data: { status, remark, location },
  })

  return NextResponse.json(course)
}

// DELETE - 删除课程（取消）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 软删除：改为取消状态
  await prisma.course.update({
    where: { id: parseInt(id) },
    data: { status: 'cancelled' },
  })

  return NextResponse.json({ success: true })
}
