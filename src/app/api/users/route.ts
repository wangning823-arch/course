import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
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
  const phoneCheck = searchParams.get('phoneCheck') || '' // 手机号检测模式：跳过俱乐部过滤

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
    ]
  }
  if (role) {
    // 支持逗号分隔的多个角色（如 part_time_coach,full_time_coach）
    const roles = role.split(',')
    if (roles.length > 1) {
      where.role = { in: roles }
    } else {
      where.role = role
    }
  }

  // 手机号检测模式：不按俱乐部过滤，搜索所有用户
  if (!phoneCheck) {
    // 按俱乐部过滤：通过 ClubMember 关联筛选属于该俱乐部的用户
    if (clubId && clubId !== 'all') {
      where.memberships = { some: { clubId: parseInt(clubId) } }
    }

    // 俱乐部管理员：强制只看自己俱乐部的用户
    const authUser = await getAuthUser(request)
    if (authUser?.role === 'club_admin' && authUser.clubId) {
      where.memberships = { some: { clubId: authUser.clubId } }
    }
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
    clubCount: u.memberships.length,
    createdAt: u.createdAt,
  }))

  return NextResponse.json(data)
}

// POST - 创建用户
export async function POST(request: NextRequest) {
  const { phone, name, role, password, clubId } = await request.json()

  if (!phone || !name || !role) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
  }

  // 通过 token 获取当前用户角色
  const authUser = await getAuthUser(request)
  const createdByRole = authUser?.role

  // 角色权限控制
  if (createdByRole === 'super_admin') {
    if (role !== 'club_admin') {
      return NextResponse.json({ error: '系统管理员只能添加俱乐部管理员' }, { status: 403 })
    }
    if (!clubId) {
      return NextResponse.json({ error: '请选择所属俱乐部' }, { status: 400 })
    }
  } else if (createdByRole === 'club_admin') {
    if (role !== 'full_time_coach' && role !== 'part_time_coach') {
      return NextResponse.json({ error: '俱乐部管理员只能添加全职教练或兼职教练' }, { status: 403 })
    }
    if (!clubId) {
      return NextResponse.json({ error: '请选择所属俱乐部' }, { status: 400 })
    }
    // 俱乐部管理员只能在自己的俱乐部创建用户
    if (authUser?.clubId && parseInt(String(clubId)) !== authUser.clubId) {
      return NextResponse.json({ error: '无权在其他俱乐部创建用户' }, { status: 403 })
    }
  } else {
    return NextResponse.json({ error: '无权创建用户' }, { status: 403 })
  }

  // 检查手机号是否已存在
  const existing = await prisma.user.findUnique({
    where: { phone },
    include: { memberships: { select: { clubId: true } } },
  })

  if (existing) {
    // 手机号已存在：如果是教练，检查是否需要关联到新俱乐部
    const targetClubId = parseInt(String(clubId))
    const alreadyMember = existing.memberships.some(m => m.clubId === targetClubId)

    if (alreadyMember) {
      return NextResponse.json({ error: '该用户已是此俱乐部成员' }, { status: 400 })
    }

    // 关联到新俱乐部
    await prisma.clubMember.create({
      data: {
        clubId: targetClubId,
        userId: existing.id,
        role: role === 'club_admin' ? 'admin' : 'coach',
      },
    })

    // 全职教练只能关联一个俱乐部
    if (role === 'full_time_coach') {
      const membershipCount = await prisma.clubMember.count({
        where: { userId: existing.id },
      })
      if (membershipCount > 1) {
        // 删除刚创建的关联
        await prisma.clubMember.deleteMany({
          where: {
            userId: existing.id,
            clubId: targetClubId,
          },
        })
        return NextResponse.json({ error: '全职教练只能关联一个俱乐部' }, { status: 400 })
      }
    }

    return NextResponse.json({
      id: existing.id,
      name: existing.name,
      phone: existing.phone,
      role: existing.role,
      message: '已关联到当前俱乐部',
    })
  }

  // 手机号不存在：创建新用户
  const finalPassword = password || '123456'
  const passwordHash = hashPassword(finalPassword)

  const user = await prisma.user.create({
    data: { phone, name, role, passwordHash },
  })

  // 创建俱乐部成员关联
  if (clubId) {
    await prisma.clubMember.create({
      data: {
        clubId: parseInt(String(clubId)),
        userId: user.id,
        role: role === 'club_admin' ? 'admin' : 'coach',
      },
    })
  }

  // 全职教练只能关联一个俱乐部
  if (role === 'full_time_coach' && clubId) {
    const membershipCount = await prisma.clubMember.count({
      where: { userId: user.id },
    })
    if (membershipCount > 1) {
      // 删除刚创建的关联
      await prisma.clubMember.deleteMany({
        where: {
          userId: user.id,
          clubId: parseInt(String(clubId)),
        },
      })
      // 删除用户
      await prisma.user.delete({
        where: { id: user.id },
      })
      return NextResponse.json({ error: '全职教练只能关联一个俱乐部' }, { status: 400 })
    }
  }

  // 如果是俱乐部管理员，同时设置为俱乐部的 adminId
  if (role === 'club_admin' && clubId) {
    await prisma.club.update({
      where: { id: parseInt(String(clubId)) },
      data: { adminId: user.id },
    })
  }

  // 全职教练只能关联一个俱乐部
  if (role === 'full_time_coach' && clubId) {
    const membershipCount = await prisma.clubMember.count({
      where: { userId: user.id },
    })
    if (membershipCount > 1) {
      // 删除刚创建的关联
      await prisma.clubMember.deleteMany({
        where: {
          userId: user.id,
          clubId: parseInt(String(clubId)),
        },
      })
      // 删除用户
      await prisma.user.delete({
        where: { id: user.id },
      })
      return NextResponse.json({ error: '全职教练只能关联一个俱乐部' }, { status: 400 })
    }
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    defaultPassword: finalPassword,
  })
}
