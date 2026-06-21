import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取学员列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { parentName: { contains: search } },
      { parentPhone: { contains: search } },
    ]
  }

  const students = await prisma.student.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(students)
}

// POST - 创建学员
export async function POST(request: NextRequest) {
  const { name, phone, gender, parentName, parentPhone, remark } = await request.json()

  if (!name) {
    return NextResponse.json({ error: '请输入学员姓名' }, { status: 400 })
  }

  const student = await prisma.student.create({
    data: { name, phone, gender, parentName, parentPhone, remark },
  })

  return NextResponse.json(student)
}
