import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT - 更新学员
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, phone, gender, parentName, parentPhone, remark, status, coachId } = await request.json()

  // 验证权限
  const authUser = await getAuthUser(request)
  const existingStudent = await prisma.student.findUnique({ where: { id: parseInt(id) }, select: { clubId: true, coachId: true } })
  if (!existingStudent) return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  if (authUser?.role === 'club_admin') {
    if (existingStudent.clubId !== authUser.clubId) {
      return NextResponse.json({ error: '无权修改其他俱乐部的学员' }, { status: 403 })
    }
  } else if (authUser?.role === 'part_time_coach') {
    // 兼职教练只能编辑自己的私有学员
    if (existingStudent.coachId !== authUser.userId) {
      return NextResponse.json({ error: '无权修改其他教练的学员' }, { status: 403 })
    }
  }

  const updatedStudent = await prisma.student.update({
    where: { id: parseInt(id) },
    data: {
      name,
      phone,
      gender,
      parentName,
      parentPhone,
      remark,
      status,
      coachId: coachId !== undefined ? (coachId ? parseInt(coachId) : null) : undefined,
    },
  })

  return NextResponse.json(updatedStudent)
}

// DELETE - 删除学员
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 验证权限
  const authUser = await getAuthUser(request)
  const existingStudent = await prisma.student.findUnique({ where: { id: parseInt(id) }, select: { clubId: true, coachId: true } })
  if (!existingStudent) return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  if (authUser?.role === 'club_admin') {
    if (existingStudent.clubId !== authUser.clubId) {
      return NextResponse.json({ error: '无权删除其他俱乐部的学员' }, { status: 403 })
    }
  } else if (authUser?.role === 'part_time_coach') {
    // 兼职教练只能删除自己的私有学员
    if (existingStudent.coachId !== authUser.userId) {
      return NextResponse.json({ error: '无权删除其他教练的学员' }, { status: 403 })
    }
  }

  await prisma.student.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
