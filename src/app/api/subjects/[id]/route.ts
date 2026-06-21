import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT - 更新科目
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, category, teachingMode, durationMinutes, price, status } = await request.json()

  // 验证俱乐部归属
  const authUser = await getAuthUser(request)
  if (authUser?.role === 'club_admin') {
    const subject = await prisma.subject.findUnique({ where: { id: parseInt(id) }, select: { clubId: true } })
    if (!subject) return NextResponse.json({ error: '科目不存在' }, { status: 404 })
    if (subject.clubId !== authUser.clubId) {
      return NextResponse.json({ error: '无权修改其他俱乐部的科目' }, { status: 403 })
    }
  }

  const subject = await prisma.subject.update({
    where: { id: parseInt(id) },
    data: { name, category, teachingMode, durationMinutes, price, status },
  })

  return NextResponse.json(subject)
}

// DELETE - 删除科目
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 验证俱乐部归属
  const authUser = await getAuthUser(request)
  if (authUser?.role === 'club_admin') {
    const subject = await prisma.subject.findUnique({ where: { id: parseInt(id) }, select: { clubId: true } })
    if (!subject) return NextResponse.json({ error: '科目不存在' }, { status: 404 })
    if (subject.clubId !== authUser.clubId) {
      return NextResponse.json({ error: '无权删除其他俱乐部的科目' }, { status: 403 })
    }
  }

  await prisma.subject.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
