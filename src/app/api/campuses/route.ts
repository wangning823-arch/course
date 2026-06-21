import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET - 获取校区列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clubId = searchParams.get('clubId')

  const where: any = {}
  if (clubId) where.clubId = parseInt(clubId)

  const campuses = await prisma.campus.findMany({
    where,
    include: {
      club: { select: { name: true } },
      _count: { select: { courses: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = campuses.map((c) => ({
    id: c.id,
    clubId: c.clubId,
    name: c.name,
    club: c.club.name,
    address: c.address,
    phone: c.phone,
    courses: c._count.courses,
    status: c.status,
    createdAt: c.createdAt,
  }))

  return NextResponse.json(data)
}

// POST - 创建校区
export async function POST(request: NextRequest) {
  const { clubId, name, address, phone } = await request.json()

  if (!clubId || !name || !address) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
  }

  // 俱乐部管理员：强制使用自己的 clubId
  const authUser = await getAuthUser(request)
  const finalClubId = authUser?.role === 'club_admin' && authUser.clubId
    ? authUser.clubId
    : parseInt(clubId)

  if (authUser?.role === 'club_admin' && authUser.clubId !== finalClubId) {
    return NextResponse.json({ error: '无权在其他俱乐部创建校区' }, { status: 403 })
  }

  const campus = await prisma.campus.create({
    data: { clubId: finalClubId, name, address, phone },
  })

  return NextResponse.json(campus)
}
