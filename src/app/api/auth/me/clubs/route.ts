import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET - 获取当前用户所属的俱乐部列表
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const memberships = await prisma.clubMember.findMany({
    where: { userId: authUser.userId },
    include: { club: { select: { id: true, name: true } } },
  })

  const clubs = memberships.map((m) => m.club)
  return NextResponse.json(clubs)
}
