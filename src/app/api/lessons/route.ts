import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取课时记录列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const coachId = searchParams.get('coachId')

  const where: any = {}
  if (search) {
    where.OR = [
      { course: { subject: { name: { contains: search } } } },
      { course: { coach: { name: { contains: search } } } },
      { student: { name: { contains: search } } },
    ]
  }
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    }
  }
  if (coachId) where.coachId = parseInt(coachId)

  const lessons = await prisma.lesson.findMany({
    where,
    include: {
      course: {
        include: {
          subject: { select: { name: true } },
          campus: { select: { name: true } },
        },
      },
      student: { select: { name: true } },
      coach: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = lessons.map((l) => ({
    id: l.id,
    date: l.createdAt.toISOString().split('T')[0],
    subject: l.course.subject.name,
    coach: l.coach.name,
    student: l.student.name,
    campus: l.course.campus?.name || '-',
    duration: l.durationMinutes || 0,
    content: l.content,
    performance: l.performance,
    status: l.status,
    courseId: l.courseId,
  }))

  return NextResponse.json(data)
}

// POST - 创建课时记录
export async function POST(request: NextRequest) {
  const {
    courseId, studentId, coachId,
    actualStart, actualEnd, durationMinutes,
    content, performance, homework,
  } = await request.json()

  if (!courseId || !studentId || !coachId) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
  }

  const lesson = await prisma.lesson.create({
    data: {
      courseId: parseInt(courseId),
      studentId: parseInt(studentId),
      coachId: parseInt(coachId),
      actualStart: actualStart ? new Date(actualStart) : null,
      actualEnd: actualEnd ? new Date(actualEnd) : null,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      content,
      performance,
      homework,
      status: 'pending',
    },
  })

  return NextResponse.json(lesson)
}
