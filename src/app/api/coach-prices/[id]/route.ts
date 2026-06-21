import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// DELETE - 删除教练定价
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 验证俱乐部归属
  const authUser = await getAuthUser(request)
  if (authUser?.role === 'club_admin') {
    const price = await prisma.coachPrice.findUnique({ where: { id: parseInt(id) }, select: { clubId: true } })
    if (!price) return NextResponse.json({ error: '定价不存在' }, { status: 404 })
    if (price.clubId !== authUser.clubId) {
      return NextResponse.json({ error: '无权删除其他俱乐部的定价' }, { status: 403 })
    }
  }

  await prisma.coachPrice.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
