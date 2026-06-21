import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// GET - 获取用户列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || ''
  const clubId = searchParams.get('clubId') || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
    ]
  }
  if (role) {
    where.role = role
  }
  // 按俱乐部过滤：通过 ClubMember 关联筛选属于该俱乐部的用户
  if (clubId) {
    where.memberships = { some: { clubId: parseInt(clubId) } }
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      memberships: {
        include: { club: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    status: u.status,
    clubs: u.memberships.map((m) => m.club.name).join('、') || '-',
    createdAt: u.createdAt,
  }))

  return NextResponse.json(data)
}

// POST - 创建用户
export async function POST(request: NextRequest) {
  const { phone, name, role, password, createdByRole, clubId } = await request.json()

  if (!phone || !name || !role) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
  }

  // 角色权限控制
  if (createdByRole === 'super_admin') {
    if (role !== 'club_admin') {
      return NextResponse.json({ error: '系统管理员只能添加俱乐部管理员' }, { status: 403 })
    }
    if (!clubId) {
      return NextResponse.json({ error: '请选择所属俱乐部' }, { status: 400 })
    }
  } else if (createdByRole === 'club_admin') {
    if (role !== 'coach') {
      return NextResponse.json({ error: '俱乐部管理员只能添加教练用户' }, { status: 403 })
    }
    if (!clubId) {
      return NextResponse.json({ error: '请选择所属俱乐部' }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: '无权创建用户' }, { status: 403 })
  }

  // 检查手机号是否已存在
  const existing = await prisma.user.findUnique({ where: { phone } })
  if (existing) {
    return NextResponse.json({ error: '手机号已存在' }, { status: 400 })
  }

  // 密码处理：默认密码 123456
  const finalPassword = password || '123456'
  const passwordHash = hashPassword(finalPassword)

  const user = await prisma.user.create({
    data: { phone, name, role, passwordHash },
  })

  // 创建俱乐部成员关联
  if (clubId) {
    await prisma.clubMember.create({
      data: {
        clubId: parseInt(clubId),
        userId: user.id,
        role: role === 'club_admin' ? 'admin' : 'coach',
      },
    })
  }

  // 如果是俱乐部管理员，同时设置为俱乐部的 adminId
  if (role === 'club_admin' && clubId) {
    await prisma.club.update({
      where: { id: parseInt(clubId) },
      data: { adminId: user.id },
    })
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    defaultPassword: finalPassword,
  })
}
