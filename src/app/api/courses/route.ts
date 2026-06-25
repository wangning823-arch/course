import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, apiError, apiSuccess } from '@/lib/api-handler'

// GET - 获取课程列表
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const coachId = searchParams.get('coachId')
  const campusId = searchParams.get('campusId')
  const clubId = searchParams.get('clubId')
  const studentId = searchParams.get('studentId')
  const studentIdsParam = searchParams.get('studentIds')

  const where: any = {}
  where.status = { not: 'cancelled' }
  if (clubId && clubId !== 'all') where.clubId = parseInt(clubId)
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
  if (studentIdsParam) {
    // 支持多个学员ID（逗号分隔）
    const ids = studentIdsParam.split(',').map(Number).filter(n => !isNaN(n))
    if (ids.length > 0) {
      where.students = { some: { studentId: { in: ids } } }
    }
  } else if (studentId) {
    where.students = { some: { studentId: parseInt(studentId) } }
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      subject: { select: { name: true } },
      coach: { select: { name: true } },
      campus: { select: { name: true } },
      students: {
        include: { student: { select: { name: true } } },
      },
      lessons: { select: { id: true } },
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
      campusId: c.campusId,
      campus: c.campus?.name || '-',
      clubId: c.clubId,
      scheduledDate: dateStr,
      date: dateStr,
      startTime: c.startTime,
      endTime: c.endTime,
      students: c.students.map((s) => s.student.name).join('、'),
      studentIds: c.students.map((s) => s.studentId),
      status: c.status,
      teachingMode: c.teachingMode,
      location: c.location,
      remark: c.remark,
      hasLesson: c.lessons.length > 0,
    }
  })

  return apiSuccess(data)
})

// POST - 创建课程（使用事务防止并发竞态条件）
export const POST = withErrorHandling(async (request: NextRequest) => {
  const {
    clubId, campusId, subjectId, coachId, teachingMode,
    scheduledDate, startTime, endTime, location, remark, createdBy,
    studentIds,
  } = await request.json()

  if ((!clubId && clubId !== null) || !subjectId || !coachId || !scheduledDate || !startTime || !endTime) {
    return apiError('请填写完整信息', 400)
  }

  // 解析日期字符串，存储为UTC午夜（避免时区偏移导致日期变化）
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
  }
  const scheduledDateObj = parseLocalDate(scheduledDate)

  // 使用事务确保冲突检测和创建的原子性
  try {
    const course = await prisma.$transaction(async (tx) => {
      // 只与未完成的课程做冲突检测（scheduled/in_progress 状态）
      const activeStatuses = ['scheduled', 'in_progress']

      // 冲突检测：检查教练是否有时间冲突
      const conflictingCoach = await tx.course.findFirst({
        where: {
          coachId: parseInt(coachId),
          scheduledDate: scheduledDateObj,
          status: { in: activeStatuses },
          OR: [
            { startTime: { lt: endTime }, endTime: { gt: startTime } },
          ],
        },
      })

      if (conflictingCoach) {
        throw new Error('CONFLICT_COACH')
      }

      // 冲突检测：检查学生是否有时间冲突
      if (studentIds && studentIds.length > 0) {
        const conflictingStudent = await tx.courseStudent.findFirst({
          where: {
            studentId: { in: studentIds.map(Number) },
            course: {
              scheduledDate: scheduledDateObj,
              status: { in: activeStatuses },
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
          },
        })

        if (conflictingStudent) {
          throw new Error('CONFLICT_STUDENT')
        }
      }

      // 冲突检测：检查场地是否有时间冲突（同一校区同一时间不能有两节课在同一场地）
      if (location && campusId) {
        const conflictingLocation = await tx.course.findFirst({
          where: {
            campusId: parseInt(campusId),
            location: location,
            scheduledDate: scheduledDateObj,
            status: { in: activeStatuses },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        })

        if (conflictingLocation) {
          throw new Error('CONFLICT_LOCATION')
        }
      }

      // 创建课程
      const newCourse = await tx.course.create({
        data: {
          clubId: clubId ? parseInt(clubId) : null,
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
        await tx.courseStudent.createMany({
          data: studentIds.map((studentId: number) => ({
            courseId: newCourse.id,
            studentId: parseInt(String(studentId)),
          })),
        })
      }

      return newCourse
    })

    return apiSuccess(course, 201)
  } catch (error) {
    // 处理冲突错误
    if (error instanceof Error) {
      if (error.message === 'CONFLICT_COACH') {
        return apiError('该教练在此时间段已有课程安排', 400)
      }
      if (error.message === 'CONFLICT_STUDENT') {
        return apiError('有学员在此时间段已有课程安排', 400)
      }
      if (error.message === 'CONFLICT_LOCATION') {
        return apiError('该场地在此时间段已有课程安排', 400)
      }
    }
    throw error
  }
})
