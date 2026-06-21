import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT - 更新校区
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, address, phone, status } = await request.json()

  // 验证俱乐部归属
  const authUser = await getAuthUser(request)
  if (authUser?.role === 'club_admin') {
    const campus = await prisma.campus.findUnique({ where: { id: parseInt(id) }, select: { clubId: true } })
    if (!campus) return NextResponse.json({ error: '校区不存在' }, { status: 404 })
    if (campus.clubId !== authUser.clubId) {
      return NextResponse.json({ error: '无权修改其他俱乐部的校区' }, { status: 403 })
    }
  }

  const campus = await prisma.campus.update({
    where: { id: parseInt(id) },
    data: { name, address, phone, status },
  })

  return NextResponse.json(campus)
}

// DELETE - 删除校区
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 验证俱乐部归属
  const authUser = await getAuthUser(request)
  if (authUser?.role === 'club_admin') {
    const campus = await prisma.campus.findUnique({ where: { id: parseInt(id) }, select: { clubId: true } })
    if (!campus) return NextResponse.json({ error: '校区不存在' }, { status: 404 })
    if (campus.clubId !== authUser.clubId) {
      return NextResponse.json({ error: '无权删除其他俱乐部的校区' }, { status: 403 })
    }
  }

  await prisma.campus.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
