import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - 更新科目
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, category, teachingMode, durationMinutes, price, status } = await request.json()

  const subject = await prisma.subject.update({
    where: { id: parseInt(id) },
    data: { name, category, teachingMode, durationMinutes, price, status },
  })

  return NextResponse.json(subject)
}

// DELETE - 删除科目
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.subject.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
