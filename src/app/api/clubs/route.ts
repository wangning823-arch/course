import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取俱乐部列表
export async function GET() {
  const clubs = await prisma.club.findMany({
    include: {
      _count: { select: { campuses: true, members: true } },
      admin: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = clubs.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    address: c.address,
    phone: c.phone,
    admin: c.admin?.name || '-',
    campuses: c._count.campuses,
    coaches: c._count.members,
    status: c.status,
    createdAt: c.createdAt,
  }))

  return NextResponse.json(data)
}

// POST - 创建俱乐部
export async function POST(request: NextRequest) {
  const { name, description, address, phone, adminId } = await request.json()

  if (!name) {
    return NextResponse.json({ error: '请输入俱乐部名称' }, { status: 400 })
  }

  const club = await prisma.club.create({
    data: {
      name,
      description,
      address,
      phone,
      adminId: adminId || 1, // 默认管理员
    },
  })

  return NextResponse.json(club)
}
