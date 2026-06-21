import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - 更新课时记录
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { content, performance, homework, status, confirmedById } = await request.json()

  const updateData: any = { content, performance, homework, status }

  if (status === 'confirmed') {
    updateData.confirmedAt = new Date()
    updateData.confirmedById = confirmedById
  }

  const lesson = await prisma.lesson.update({
    where: { id: parseInt(id) },
    data: updateData,
  })

  return NextResponse.json(lesson)
}

// DELETE - 删除课时记录
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.lesson.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
