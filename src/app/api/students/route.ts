import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取学员列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const clubId = searchParams.get('clubId')
  const coachId = searchParams.get('coachId') // 当前登录教练的ID

  if (!clubId) {
    return NextResponse.json({ error: '缺少clubId参数' }, { status: 400 })
  }

  const where: any = { clubId: parseInt(clubId) }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { parentName: { contains: search } },
      { parentPhone: { contains: search } },
    ]
  }

  // 教练视角：只看共享学员(coachId=null) + 自己的私有学员
  if (coachId) {
    where.OR = [
      { coachId: null },           // 俱乐部共享
      { coachId: parseInt(coachId) }, // 自己的私有学员
    ]
  }

  const students = await prisma.student.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      coach: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(students)
}

// POST - 创建学员
export async function POST(request: NextRequest) {
  const { name, phone, gender, parentName, parentPhone, remark, clubId, coachId } = await request.json()

  if (!name) {
    return NextResponse.json({ error: '请输入学员姓名' }, { status: 400 })
  }

  if (!clubId) {
    return NextResponse.json({ error: '请选择俱乐部' }, { status: 400 })
  }

  const student = await prisma.student.create({
    data: {
      clubId: parseInt(clubId),
      coachId: coachId ? parseInt(coachId) : null,
      name,
      phone,
      gender,
      parentName,
      parentPhone,
      remark,
    },
  })

  return NextResponse.json(student)
}
