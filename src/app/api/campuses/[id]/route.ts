import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - 更新校区
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, address, phone, status } = await request.json()

  const campus = await prisma.campus.update({
    where: { id: parseInt(id) },
    data: { name, address, phone, status },
  })

  return NextResponse.json(campus)
}

// DELETE - 删除校区
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.campus.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
