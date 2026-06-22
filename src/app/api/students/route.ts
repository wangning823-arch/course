import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET - 获取学员列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const clubId = searchParams.get('clubId')
  const coachId = searchParams.get('coachId')

  if (!clubId && !coachId) {
    return NextResponse.json({ error: '缺少clubId参数' }, { status: 400 })
  }

  const searchFilter = search ? {
    OR: [
      { name: { contains: search } },
      { phone: { contains: search } },
      { parentName: { contains: search } },
      { parentPhone: { contains: search } },
    ],
  } : undefined

  let students: any[] = []

  if (coachId) {
    const cid = parseInt(coachId)

    // 私人课程模式：只返回教练的纯私有学员（clubId=null）
    if (clubId === 'private') {
      const where: any = { clubId: null, coachId: cid }
      if (searchFilter) where.AND = [searchFilter]
      students = await prisma.student.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { coach: { select: { id: true, name: true } } },
      })
    } else {
      const filterByClub = clubId && clubId !== 'all' ? parseInt(clubId) : null

      // 查出教练所属的俱乐部列表
      const memberships = await prisma.clubMember.findMany({
        where: { userId: cid },
        select: { clubId: true },
      })
      const clubIds = filterByClub
        ? (memberships.some(m => m.clubId === filterByClub) ? [filterByClub] : [])
        : memberships.map(m => m.clubId)

      // 使用 Map 去重，以学员 ID 为键
      const studentMap = new Map<number, any>()

      // 所属俱乐部内的共享学员（coachId=null）
      if (clubIds.length > 0) {
        const where: any = { clubId: { in: clubIds }, coachId: null }
        if (searchFilter) where.AND = [searchFilter]
        const shared = await prisma.student.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: { coach: { select: { id: true, name: true } } },
        })
        shared.forEach(s => studentMap.set(s.id, s))
      }

      // 所属俱乐部内的该教练私有学员
      if (clubIds.length > 0) {
        const where: any = { clubId: { in: clubIds }, coachId: cid }
        if (searchFilter) where.AND = [searchFilter]
        const privateInClub = await prisma.student.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: { coach: { select: { id: true, name: true } } },
        })
        privateInClub.forEach(s => studentMap.set(s.id, s))
      }

      // 教练的纯私有学员（clubId=null）- 只有在查看全部时才显示
      if (!filterByClub) {
        const where: any = { clubId: null, coachId: cid }
        if (searchFilter) where.AND = [searchFilter]
        const purePrivate = await prisma.student.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: { coach: { select: { id: true, name: true } } },
        })
        purePrivate.forEach(s => studentMap.set(s.id, s))
      }

      // 转换为数组并按创建时间倒序排列
      students = Array.from(studentMap.values()).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
  } else {
    // 管理员视角：按俱乐部过滤
    const where: any = {}
    if (clubId && clubId !== 'all') {
      where.clubId = parseInt(clubId)
    }
    if (searchFilter) where.AND = [searchFilter]
    students = await prisma.student.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { coach: { select: { id: true, name: true } } },
    })
  }

  return NextResponse.json(students)
}

// POST - 创建学员
export async function POST(request: NextRequest) {
  const { name, phone, gender, parentName, parentPhone, remark, clubId, coachId } = await request.json()

  if (!name) {
    return NextResponse.json({ error: '请输入学员姓名' }, { status: 400 })
  }

  const authUser = await getAuthUser(request)

  let finalClubId: number | null = null
  let finalCoachId: number | null = null

  if (authUser?.role === 'part_time_coach') {
    if (clubId === null || clubId === undefined || clubId === '') {
      // 兼职教练创建纯私有学员（无俱乐部关联）
      finalClubId = null
      finalCoachId = authUser.userId
    } else {
      // 兼职教练创建俱乐部学员：验证教练是否属于该俱乐部
      const membership = await prisma.clubMember.findFirst({
        where: { userId: authUser.userId, clubId: parseInt(clubId) },
      })
      if (!membership) {
        return NextResponse.json({ error: '无权在该俱乐部创建学员' }, { status: 403 })
      }
      finalClubId = parseInt(clubId)
      finalCoachId = coachId ? parseInt(coachId) : null
    }
  } else if (authUser?.role === 'club_admin' || authUser?.role === 'full_time_coach') {
    // 管理员/全职教练创建的学员必须属于自己的俱乐部
    if (!clubId) {
      return NextResponse.json({ error: '请选择俱乐部' }, { status: 400 })
    }
    finalClubId = authUser.clubId ? authUser.clubId : parseInt(clubId)
    finalCoachId = coachId ? parseInt(coachId) : null
  } else {
    if (!clubId) {
      return NextResponse.json({ error: '请选择俱乐部' }, { status: 400 })
    }
    finalClubId = parseInt(clubId)
    finalCoachId = coachId ? parseInt(coachId) : null
  }

  const student = await prisma.student.create({
    data: {
      clubId: finalClubId,
      coachId: finalCoachId,
      name,
      phone,
      gender: gender ? parseInt(String(gender)) : null,
      parentName,
      parentPhone,
      remark,
    },
  })

  return NextResponse.json(student)
}
