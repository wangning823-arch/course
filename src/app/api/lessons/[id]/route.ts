import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - 更新课时记录
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { content, performance, homework, status, confirmedById } = await request.json()

  const updateData: any = { content, performance, homework, status }

  if (status === 'confirmed') {
    updateData.confirmedAt = new Date()
    updateData.confirmedById = confirmedById
  }

  const lesson = await prisma.lesson.update({
    where: { id: parseInt(id) },
    data: updateData,
  })

  return NextResponse.json(lesson)
}

// DELETE - 删除课时记录
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lessonId = parseInt(id)

  // 先查找课时，获取关联的 courseId
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  })

  if (!lesson) {
    return NextResponse.json({ error: '课时不存在' }, { status: 404 })
  }

  const courseId = lesson.courseId

  // 删除课时
  await prisma.lesson.delete({ where: { id: lessonId } })

  // 如果有关联课程，检查是否需要回滚课程状态
  if (courseId) {
    const remainingCount = await prisma.lesson.count({
      where: { courseId },
    })

    // 如果该课程下已无课时，且课程状态为已完成，回滚为已排课
    if (remainingCount === 0) {
      await prisma.course.update({
        where: { id: courseId },
        data: { status: 'scheduled' },
      })
    }
  }

  return NextResponse.json({ success: true })
}
