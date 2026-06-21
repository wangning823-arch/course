import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取单个俱乐部
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const club = await prisma.club.findUnique({
    where: { id: parseInt(id) },
    select: { id: true, name: true, description: true, address: true, phone: true, status: true },
  })
  if (!club) {
    return NextResponse.json({ error: '俱乐部不存在' }, { status: 404 })
  }
  return NextResponse.json(club)
}

// PUT - 更新俱乐部
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, description, address, phone, status } = await request.json()

  const club = await prisma.club.update({
    where: { id: parseInt(id) },
    data: { name, description, address, phone, status },
  })

  return NextResponse.json(club)
}

// DELETE - 删除俱乐部
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.club.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
