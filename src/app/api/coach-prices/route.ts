import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取教练定价列表（按俱乐部过滤）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clubId = searchParams.get('clubId')
  const coachId = searchParams.get('coachId')

  if (!clubId) {
    return NextResponse.json({ error: '缺少 clubId 参数' }, { status: 400 })
  }

  const where: any = { clubId: parseInt(clubId) }
  if (coachId) where.coachId = parseInt(coachId)

  const prices = await prisma.coachPrice.findMany({
    where,
    include: {
      coach: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: [{ coach: { name: 'asc' } }, { subject: { name: 'asc' } }],
  })

  const data = prices.map((p) => ({
    id: p.id,
    clubId: p.clubId,
    coachId: p.coachId,
    coachName: p.coach.name,
    subjectId: p.subjectId,
    subjectName: p.subject.name,
    teachingMode: p.teachingMode,
    price: Number(p.price),
  }))

  return NextResponse.json(data)
}

// POST - 创建教练定价
export async function POST(request: NextRequest) {
  const { clubId, coachId, subjectId, teachingMode, price } = await request.json()

  if (!clubId || !coachId || !subjectId || !teachingMode || price === undefined) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
  }

  // 检查是否已存在同组合的定价
  const existing = await prisma.coachPrice.findUnique({
    where: {
      clubId_coachId_subjectId_teachingMode: {
        clubId: parseInt(clubId),
        coachId: parseInt(coachId),
        subjectId: parseInt(subjectId),
        teachingMode,
      },
    },
  })

  if (existing) {
    // 更新已有定价
    const updated = await prisma.coachPrice.update({
      where: { id: existing.id },
      data: { price },
    })
    return NextResponse.json(updated)
  }

  const priceRecord = await prisma.coachPrice.create({
    data: {
      clubId: parseInt(clubId),
      coachId: parseInt(coachId),
      subjectId: parseInt(subjectId),
      teachingMode,
      price,
    },
  })

  return NextResponse.json(priceRecord)
}
