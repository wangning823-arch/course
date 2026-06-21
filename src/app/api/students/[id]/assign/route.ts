import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT - 切换学员归属（共享/私有）
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { coachId } = await request.json()

  // 验证俱乐部归属
  const authUser = await getAuthUser(request)
  if (authUser?.role === 'club_admin') {
    const student = await prisma.student.findUnique({ where: { id: parseInt(id) }, select: { clubId: true } })
    if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })
    if (student.clubId !== authUser.clubId) {
      return NextResponse.json({ error: '无权操作其他俱乐部的学员' }, { status: 403 })
    }
  }

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
