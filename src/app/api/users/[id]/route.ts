import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// PUT - 更新用户
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, phone, role, status, password, oldPassword } = await request.json()

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone
  if (role !== undefined) updateData.role = role
  if (status !== undefined) updateData.status = status

  // 修改密码
  if (password) {
    if (oldPassword) {
      // 验证旧密码
      const user = await prisma.user.findUnique({ where: { id: parseInt(id) } })
      if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 })
      }
      const hashedOld = hashPassword(oldPassword)
      if (user.passwordHash !== hashedOld) {
        return NextResponse.json({ error: '原密码错误' }, { status: 400 })
      }
    }
    updateData.passwordHash = hashPassword(password)
  }

  const user = await prisma.user.update({
    where: { id: parseInt(id) },
    data: updateData,
  })

  return NextResponse.json(user)
}

// DELETE - 删除用户
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  await prisma.user.delete({ where: { id: parseInt(id) } })

  return NextResponse.json({ success: true })
}
