import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - 更新学员
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, phone, gender, parentName, parentPhone, remark, status, coachId } = await request.json()

  const student = await prisma.student.update({
    where: { id: parseInt(id) },
    data: {
      name,
      phone,
      gender,
      parentName,
      parentPhone,
      remark,
      status,
      coachId: coachId !== undefined ? (coachId ? parseInt(coachId) : null) : undefined,
    },
  })

  return NextResponse.json(student)
}

// DELETE - 删除学员
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.student.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
