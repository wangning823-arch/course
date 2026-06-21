import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
