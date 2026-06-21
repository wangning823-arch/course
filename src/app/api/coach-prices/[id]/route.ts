import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE - 删除教练定价
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.coachPrice.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
