import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'
import { verifyPassword } from '@/lib/password'

export async function POST(request: NextRequest) {
  const { phone, password } = await request.json()

  if (!phone || !password) {
    return NextResponse.json({ error: '请输入手机号和密码' }, { status: 400 })
  }

  // 查找用户
  const user = await prisma.user.findUnique({ where: { phone } })

  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 400 })
  }

  if (user.status !== 1) {
    return NextResponse.json({ error: '账号已被禁用' }, { status: 400 })
  }

  // 验证密码（使用 bcrypt）
  if (!user.passwordHash) {
    return NextResponse.json({ error: '账号密码异常，请联系管理员' }, { status: 400 })
  }
  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return NextResponse.json({ error: '密码错误' }, { status: 400 })
  }

  // 生成 JWT token
  const token = signToken({ userId: user.id, phone: user.phone })

  // 获取用户的俱乐部信息
  let clubId: number | null = null
  if (user.role === 'student') {
    // 学员：通过 Student 表获取 clubId
    const student = await prisma.student.findFirst({
      where: { userId: user.id },
      select: { clubId: true },
    })
    if (student) {
      clubId = student.clubId
    }
  } else if (user.role === 'parent') {
    // 家长：通过管理的学员获取 clubId
    const childStudent = await prisma.student.findFirst({
      where: { parentId: user.id },
      select: { clubId: true },
    })
    if (childStudent) {
      clubId = childStudent.clubId
    }
  } else if (user.role !== 'super_admin') {
    // 其他角色：通过 ClubMember 获取
    const membership = await prisma.clubMember.findFirst({
      where: { userId: user.id },
      select: { clubId: true },
    })
    if (membership) {
      clubId = membership.clubId
    }
  }

  return NextResponse.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      clubId,
    },
  })
}
