import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取课时记录列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const coachId = searchParams.get('coachId')
  const clubId = searchParams.get('clubId')

  const where: any = {}
  if (clubId) where.course = { clubId: parseInt(clubId) }
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

  const data = lessons.map((l) => {
    // 本地日期格式化
    const d = new Date(l.createdAt)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return {
      id: l.id,
      date: dateStr,
      subject: l.course?.subject?.name || '-',
      coach: l.coach.name,
      student: l.student.name,
      campus: l.course?.campus?.name || '-',
      duration: l.durationMinutes || 0,
      content: l.content,
      performance: l.performance,
      status: l.status,
      courseId: l.courseId,
    }
  })

  return NextResponse.json(data)
}

// POST - 创建课时记录
export async function POST(request: NextRequest) {
  const {
    courseId, subjectId, scheduledDate, studentId, coachId,
    actualStart, actualEnd, durationMinutes,
    content, performance, homework,
  } = await request.json()

  // 验证：选择课程时只需学员和教练；不选课程时需要科目、日期、学员和教练
  if (courseId) {
    if (!studentId || !coachId) {
      return NextResponse.json({ error: '请填写学员和教练' }, { status: 400 })
    }
  } else {
    if (!subjectId || !scheduledDate || !studentId || !coachId) {
      return NextResponse.json({ error: '请填写科目、日期、学员和教练' }, { status: 400 })
    }
  }

  let finalCourseId = courseId ? parseInt(courseId) : null

  // 如果没有选择课程，自动创建一个临时课程
  if (!finalCourseId && subjectId && scheduledDate && coachId) {
    // 获取科目信息以确定默认时长
    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId) },
      select: { clubId: true, durationMinutes: true },
    })

    if (!subject) {
      return NextResponse.json({ error: '科目不存在' }, { status: 400 })
    }

    const duration = durationMinutes ? parseInt(durationMinutes) : subject.durationMinutes || 60
    const startParts = (actualStart || '09:00').split(':')
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1] || '0')
    const endMinutes = startMinutes + duration
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

    const course = await prisma.course.create({
      data: {
        clubId: subject.clubId,
        subjectId: parseInt(subjectId),
        coachId: parseInt(coachId),
        teachingMode: 'private',
        scheduledDate: new Date(scheduledDate),
        startTime: actualStart || '09:00',
        endTime: endTime,
        status: 'completed',
        createdBy: parseInt(coachId),
      },
    })
    finalCourseId = course.id
  }

  const lesson = await prisma.lesson.create({
    data: {
      courseId: finalCourseId!,
      studentId: parseInt(studentId),
      coachId: parseInt(coachId),
      actualStart: actualStart ? new Date(`${scheduledDate || new Date().toISOString().split('T')[0]}T${actualStart}`) : null,
      actualEnd: actualEnd ? new Date(`${scheduledDate || new Date().toISOString().split('T')[0]}T${actualEnd}`) : null,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      content,
      performance,
      homework,
      status: 'pending',
    },
  })

  return NextResponse.json(lesson)
}
