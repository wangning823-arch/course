import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET - 获取科目列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clubId = searchParams.get('clubId')

  const where: any = {}
  if (clubId) where.clubId = parseInt(clubId)

  const subjects = await prisma.subject.findMany({
    where,
    include: {
      club: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = subjects.map((s) => ({
    id: s.id,
    clubId: s.clubId,
    name: s.name,
    category: s.category,
    durationMinutes: s.durationMinutes,
    club: s.club.name,
    status: s.status,
    createdAt: s.createdAt,
  }))

  return NextResponse.json(data)
}

// POST - 创建科目
export async function POST(request: NextRequest) {
  const { clubId, name, category, durationMinutes, description } = await request.json()

  if (!clubId || !name) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
  }

  // 俱乐部管理员：强制使用自己的 clubId
  const authUser = await getAuthUser(request)
  const finalClubId = authUser?.role === 'club_admin' && authUser.clubId
    ? authUser.clubId
    : parseInt(clubId)

  // 如果是俱乐部管理员，验证 clubId 是否匹配
  if (authUser?.role === 'club_admin' && authUser.clubId !== finalClubId) {
    return NextResponse.json({ error: '无权在其他俱乐部创建科目' }, { status: 403 })
  }

  const subject = await prisma.subject.create({
    data: {
      clubId: finalClubId,
      name,
      category,
      teachingMode: 'private', // 默认一对一，具体在教练定价中设置
      durationMinutes: parseInt(String(durationMinutes)) || 60,
      price: 0, // 课时单价在教练定价中设置
      description,
    },
  })

  return NextResponse.json(subject)
}
