import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - 切换学员归属（共享/私有）
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { coachId } = await request.json()

  // coachId = null → 共享给俱乐部所有教练
  // coachId = 数字 → 私有给该教练
  const student = await prisma.student.update({
    where: { id: parseInt(id) },
    data: { coachId: coachId !== undefined ? (coachId ? parseInt(coachId) : null) : undefined },
    include: {
      coach: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(student)
}
