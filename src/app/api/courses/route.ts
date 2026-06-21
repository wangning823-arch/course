import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取课程列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const coachId = searchParams.get('coachId')
  const campusId = searchParams.get('campusId')

  const where: any = {}
  if (startDate && endDate) {
    where.scheduledDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    }
  }
  if (coachId) where.coachId = parseInt(coachId)
  if (campusId) where.campusId = parseInt(campusId)

  const courses = await prisma.course.findMany({
    where,
    include: {
      subject: { select: { name: true } },
      coach: { select: { name: true } },
      campus: { select: { name: true } },
      students: {
        include: { student: { select: { name: true } } },
      },
    },
    orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
  })

  const data = courses.map((c) => ({
    id: c.id,
    subject: c.subject.name,
    coach: c.coach.name,
    campus: c.campus?.name || '-',
    date: c.scheduledDate.toISOString().split('T')[0],
    startTime: c.startTime,
    endTime: c.endTime,
    students: c.students.map((s) => s.student.name).join('、'),
    status: c.status,
    teachingMode: c.teachingMode,
    location: c.location,
    remark: c.remark,
  }))

  return NextResponse.json(data)
}

// POST - 创建课程
export async function POST(request: NextRequest) {
  const {
    clubId, campusId, subjectId, coachId, teachingMode,
    scheduledDate, startTime, endTime, location, remark, createdBy,
    studentIds,
  } = await request.json()

  if (!clubId || !subjectId || !coachId || !scheduledDate || !startTime || !endTime) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
  }

  // 冲突检测：检查教练是否有时间冲突
  const conflictingCoach = await prisma.course.findFirst({
    where: {
      coachId: parseInt(coachId),
      scheduledDate: new Date(scheduledDate),
      status: { not: 'cancelled' },
      OR: [
        { startTime: { lt: endTime }, endTime: { gt: startTime } },
      ],
    },
  })

  if (conflictingCoach) {
    return NextResponse.json({ error: '该教练在此时间段已有课程安排' }, { status: 400 })
  }

  // 冲突检测：检查学生是否有时间冲突
  if (studentIds && studentIds.length > 0) {
    const conflictingStudent = await prisma.courseStudent.findFirst({
      where: {
        studentId: { in: studentIds.map(Number) },
        course: {
          scheduledDate: new Date(scheduledDate),
          status: { not: 'cancelled' },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      },
    })

    if (conflictingStudent) {
      return NextResponse.json({ error: '有学员在此时间段已有课程安排' }, { status: 400 })
    }
  }

  const course = await prisma.course.create({
    data: {
      clubId: parseInt(clubId),
      campusId: campusId ? parseInt(campusId) : null,
      subjectId: parseInt(subjectId),
      coachId: parseInt(coachId),
      teachingMode: teachingMode || 'private',
      scheduledDate: new Date(scheduledDate),
      startTime,
      endTime,
      location,
      remark,
      createdBy: createdBy || 1,
    },
  })

  // 添加学生关联
  if (studentIds && studentIds.length > 0) {
    await prisma.courseStudent.createMany({
      data: studentIds.map((studentId: number) => ({
        courseId: course.id,
        studentId: parseInt(String(studentId)),
      })),
    })
  }

  return NextResponse.json(course)
}
