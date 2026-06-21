import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取教练定价列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const coachId = searchParams.get('coachId')

  const where: any = {}
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
  const { coachId, subjectId, teachingMode, price } = await request.json()

  if (!coachId || !subjectId || !teachingMode || price === undefined) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
  }

  // 检查是否已存在同组合的定价
  const existing = await prisma.coachPrice.findUnique({
    where: {
      coachId_subjectId_teachingMode: {
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
      coachId: parseInt(coachId),
      subjectId: parseInt(subjectId),
      teachingMode,
      price,
    },
  })

  return NextResponse.json(priceRecord)
}
