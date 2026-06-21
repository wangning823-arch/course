import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// 密码哈希函数
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

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

  // 验证密码
  const hashedPassword = hashPassword(password)
  if (user.passwordHash !== hashedPassword) {
    return NextResponse.json({ error: '密码错误' }, { status: 400 })
  }

  // 生成 token
  const token = Buffer.from(JSON.stringify({ userId: user.id, phone: user.phone })).toString('base64')

  return NextResponse.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
  })
}
