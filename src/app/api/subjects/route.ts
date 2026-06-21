import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    name: s.name,
    category: s.category,
    teachingMode: s.teachingMode,
    durationMinutes: s.durationMinutes,
    price: Number(s.price),
    club: s.club.name,
    status: s.status,
    createdAt: s.createdAt,
  }))

  return NextResponse.json(data)
}

// POST - 创建科目
export async function POST(request: NextRequest) {
  const { clubId, name, category, teachingMode, durationMinutes, price, description } = await request.json()

  if (!clubId || !name || !teachingMode || !price) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
  }

  const subject = await prisma.subject.create({
    data: {
      clubId: parseInt(clubId),
      name,
      category,
      teachingMode,
      durationMinutes: parseInt(durationMinutes) || 60,
      price: parseFloat(price),
      description,
    },
  })

  return NextResponse.json(subject)
}
