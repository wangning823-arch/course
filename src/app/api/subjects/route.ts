import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET - 获取科目列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clubId = searchParams.get('clubId')
  const coachId = searchParams.get('coachId')

  const where: any = {}
  if (coachId) {
    if (clubId === 'private') {
      // 私人科目：只看该教练自己的私人科目
      where.clubId = null
      where.coachId = parseInt(coachId)
    } else if (clubId) {
      // 指定俱乐部 + 教练：加载该俱乐部的科目 + 教练的私人科目
      where.OR = [
        { clubId: parseInt(clubId) },
        { AND: [{ clubId: null }, { coachId: parseInt(coachId) }] },
      ]
    } else {
      // 教练：加载其所属所有俱乐部的科目 + 该教练的私人科目
      const memberships = await prisma.clubMember.findMany({
        where: { userId: parseInt(coachId) },
        select: { clubId: true },
      })
      const clubIds = memberships.map(m => m.clubId)
      where.OR = [
        ...(clubIds.length > 0 ? [{ clubId: { in: clubIds } }] : []),
        { AND: [{ clubId: null }, { coachId: parseInt(coachId) }] },
      ]
    }
  } else if (clubId) {
    where.clubId = parseInt(clubId)
  }

  const subjects = await prisma.subject.findMany({
    where,
    include: {
      club: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = subjects.map((s) => ({
    id: s.id,
    clubId: s.clubId,
    coachId: s.coachId,
    name: s.name,
    category: s.category,
    durationMinutes: s.durationMinutes,
    club: s.club?.name || '私人科目',
    status: s.status,
    createdAt: s.createdAt,
  }))

  return NextResponse.json(data)
}

// POST - 创建科目
export async function POST(request: NextRequest) {
  const { clubId, coachId, name, category, durationMinutes, description } = await request.json()

  if (!name) {
    return NextResponse.json({ error: '请填写科目名称' }, { status: 400 })
  }

  const authUser = await getAuthUser(request)

  // 确定是私人科目还是俱乐部科目
  let finalClubId: number | null = null
  let finalCoachId: number | null = null

  if (clubId === null || clubId === undefined || clubId === '') {
    // 私人科目：clubId 为 null，coachId 为当前用户
    // 全职教练不能创建私人科目
    if (authUser?.role === 'full_time_coach') {
      return NextResponse.json({ error: '全职教练不能创建私人科目' }, { status: 403 })
    }
    finalClubId = null
    finalCoachId = authUser?.userId || (coachId ? parseInt(coachId) : null)
  } else {
    // 俱乐部科目
    finalClubId = authUser?.role === 'club_admin' && authUser.clubId
      ? authUser.clubId
      : parseInt(clubId)

    // 如果是俱乐部管理员，验证 clubId 是否匹配
    if (authUser?.role === 'club_admin' && authUser.clubId !== finalClubId) {
      return NextResponse.json({ error: '无权在其他俱乐部创建科目' }, { status: 403 })
    }
  }

  const subject = await prisma.subject.create({
    data: {
      clubId: finalClubId,
      coachId: finalCoachId,
      name,
      category,
      teachingMode: 'private', // 默认一对一，具体在教练定价中设置
      durationMinutes: parseInt(String(durationMinutes)) || 60,
      price: 0, // 课时单价在教练定价中设置
      description,
    },
  })

  return NextResponse.json(subject)
}
