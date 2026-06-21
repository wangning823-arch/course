import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

  const campus = await prisma.campus.create({
    data: { clubId: parseInt(clubId), name, address, phone },
  })

  return NextResponse.json(campus)
}
