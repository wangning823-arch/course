import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取课程列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const coachId = searchParams.get('coachId')
  const campusId = searchParams.get('campusId')
  const clubId = searchParams.get('clubId')

  const where: any = {}
  if (clubId) where.clubId = parseInt(clubId)
  if (startDate && endDate) {
    // 日期字符串转为UTC时间范围（与存储格式一致）
    const [sy, sm, sd] = startDate.split('-').map(Number)
    const [ey, em, ed] = endDate.split('-').map(Number)
    where.scheduledDate = {
      gte: new Date(Date.UTC(sy, sm - 1, sd)),
      lte: new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59)),
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

  const data = courses.map((c) => {
    // 本地日期格式化
    const d = new Date(c.scheduledDate)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return {
      id: c.id,
      subjectId: c.subjectId,
      subject: c.subject.name,
      coachId: c.coachId,
      coach: c.coach.name,
      campus: c.campus?.name || '-',
      date: dateStr,
      startTime: c.startTime,
      endTime: c.endTime,
      students: c.students.map((s) => s.student.name).join('、'),
      studentIds: c.students.map((s) => s.studentId),
      status: c.status,
      teachingMode: c.teachingMode,
      location: c.location,
      remark: c.remark,
    }
  })

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

  // 解析日期字符串，存储为UTC午夜（避免时区偏移导致日期变化）
  // new Date("2026-06-20") 在 UTC+8 会变成 2026-06-19T16:00:00Z，存入SQLite后读出日期会错
  // 解决：用本地日期创建，再转为同日UTC午夜的ISO字符串，Prisma存储时不会偏移
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
  }
  const scheduledDateObj = parseLocalDate(scheduledDate)

  // 冲突检测：检查教练是否有时间冲突
  const conflictingCoach = await prisma.course.findFirst({
    where: {
      coachId: parseInt(coachId),
      scheduledDate: scheduledDateObj,
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
          scheduledDate: scheduledDateObj,
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
      scheduledDate: scheduledDateObj,
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
