import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - 为课程记录课时（一键记录，每个学员一条记录）
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const courseId = parseInt(id)

  // 检查课程是否存在
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      students: { select: { studentId: true } },
    },
  })

  if (!course) {
    return NextResponse.json({ error: '课程不存在' }, { status: 404 })
  }

  // 检查是否已经记录过课时
  const existingLessons = await prisma.lesson.findMany({
    where: { courseId },
  })

  if (existingLessons.length > 0) {
    return NextResponse.json({ error: '该课程已记录过课时，不能重复记录' }, { status: 400 })
  }

  // 检查是否有学员
  if (course.students.length === 0) {
    return NextResponse.json({ error: '该课程没有学员，无法记录课时' }, { status: 400 })
  }

  // 为每个学员创建一条课时记录
  const scheduledDate = new Date(course.scheduledDate)
  const dateStr = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`

  const lessons = await Promise.all(
    course.students.map((cs) =>
      prisma.lesson.create({
        data: {
          courseId,
          studentId: cs.studentId,
          coachId: course.coachId,
          actualStart: new Date(`${dateStr}T${course.startTime}`),
          actualEnd: new Date(`${dateStr}T${course.endTime}`),
          durationMinutes: (() => {
            const [sh, sm] = course.startTime.split(':').map(Number)
            const [eh, em] = course.endTime.split(':').map(Number)
            return (eh * 60 + em) - (sh * 60 + sm)
          })(),
          status: 'pending',
        },
      })
    )
  )

  return NextResponse.json({ success: true, count: lessons.length })
}

// GET - 检查课程是否已记录课时
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const courseId = parseInt(id)

  const count = await prisma.lesson.count({
    where: { courseId },
  })

  return NextResponse.json({ recorded: count > 0, count })
}
