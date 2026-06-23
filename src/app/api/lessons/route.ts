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
  const courseId = searchParams.get('courseId')
  const timeRange = searchParams.get('timeRange')

  const where: any = {}
  // 按课程ID过滤（优先级最高）
  if (courseId) {
    where.courseId = parseInt(courseId)
  } else if (clubId && clubId !== 'all') {
    where.course = { clubId: parseInt(clubId) }
  }
  if (search) {
    where.OR = [
      { course: { subject: { name: { contains: search } } } },
      { course: { coach: { name: { contains: search } } } },
      { student: { name: { contains: search } } },
    ]
  }
  if (coachId) where.coachId = parseInt(coachId)

  // 处理时间范围
  if (timeRange && timeRange !== 'all') {
    const now = new Date()
    let startDateFilter: Date | null = null
    let endDateFilter: Date | null = null

    switch (timeRange) {
      case 'today':
        startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case 'week':
        const dayOfWeek = now.getDay()
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset)
        endDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - mondayOffset), 23, 59, 59)
        break
      case 'month':
        startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1)
        endDateFilter = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        startDateFilter = new Date(now.getFullYear(), quarterStart, 1)
        endDateFilter = new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59)
        break
      case 'year':
        startDateFilter = new Date(now.getFullYear(), 0, 1)
        endDateFilter = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        break
    }

    if (startDateFilter && endDateFilter) {
      where.course = {
        ...where.course,
        scheduledDate: {
          gte: startDateFilter,
          lte: endDateFilter,
        },
      }
    }
  } else if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    }
  }

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
    // 使用课程的上课日期，而不是课时记录的创建时间
    const d = l.course?.scheduledDate ? new Date(l.course.scheduledDate) : new Date(l.createdAt)
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
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
  const {
    courseId, clubId, subjectId, scheduledDate, studentId, coachId,
    actualStart, actualEnd, durationMinutes,
    content, performance, homework,
  } = body

  // 验证：选择课程时只需学员和教练；不选课程时需要俱乐部、科目、日期、学员和教练
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

  try {
    // 解析日期字符串，存储为UTC午夜（避免时区偏移导致日期变化）
    const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(Date.UTC(year, month - 1, day))
    }

    // 如果没有选择课程，自动创建一个临时课程
    if (!finalCourseId && subjectId && scheduledDate && coachId) {
      // 获取科目信息以确定默认时长和俱乐部
      const subject = await prisma.subject.findUnique({
        where: { id: parseInt(subjectId) },
        select: { clubId: true, coachId: true, durationMinutes: true },
      })

      if (!subject) {
        return NextResponse.json({ error: '科目不存在' }, { status: 400 })
      }

      // 确定俱乐部ID：优先使用传入的clubId，其次用科目的clubId
      const finalClubId = clubId !== undefined && clubId !== null && clubId !== '' ? parseInt(clubId) : subject.clubId

      const duration = durationMinutes ? parseInt(durationMinutes) : subject.durationMinutes || 60
      const startParts = (actualStart || '09:00').split(':')
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1] || '0')
      const endMinutes = startMinutes + duration
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

      const course = await prisma.course.create({
        data: {
          clubId: finalClubId,
          subjectId: parseInt(subjectId),
          coachId: parseInt(coachId),
          teachingMode: 'private',
          scheduledDate: parseLocalDate(scheduledDate),
          startTime: actualStart || '09:00',
          endTime: endTime,
          status: 'completed',
          createdBy: parseInt(coachId),
        },
      })
      finalCourseId = course.id
    }

    const lessonDate = scheduledDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`

    const lesson = await prisma.lesson.create({
      data: {
        courseId: finalCourseId!,
        studentId: parseInt(studentId),
        coachId: parseInt(coachId),
        actualStart: actualStart ? new Date(`${lessonDate}T${actualStart}`) : null,
        actualEnd: actualEnd ? new Date(`${lessonDate}T${actualEnd}`) : null,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
        content,
        performance,
        homework,
        status: 'pending',
      },
    })

    return NextResponse.json(lesson)
  } catch (e: any) {
    console.error('[lessons POST] error:', e.message)
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
