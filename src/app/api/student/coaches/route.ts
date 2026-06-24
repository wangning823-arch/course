import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/student/coaches - 获取可预约的教练列表
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clubId = searchParams.get('clubId')

  if (!clubId) {
    return NextResponse.json({ error: '请指定俱乐部' }, { status: 400 })
  }

  // 获取该俱乐部的教练
  const memberships = await prisma.clubMember.findMany({
    where: {
      clubId: parseInt(clubId),
      role: 'coach',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          gender: true,
        },
      },
    },
  })

  // 获取教练的科目信息
  const coachIds = memberships.map(m => m.user.id)
  const coachPrices = await prisma.coachPrice.findMany({
    where: {
      clubId: parseInt(clubId),
      coachId: { in: coachIds },
    },
    include: {
      subject: true,
    },
  })

  // 按教练分组科目
  const coachSubjects: { [key: number]: any[] } = {}
  coachPrices.forEach(price => {
    if (!coachSubjects[price.coachId]) {
      coachSubjects[price.coachId] = []
    }
    coachSubjects[price.coachId].push({
      id: price.subject.id,
      name: price.subject.name,
      price: price.price,
      teachingMode: price.teachingMode,
    })
  })

  // 组装教练列表
  const coaches = memberships.map(m => ({
    id: m.user.id,
    name: m.user.name,
    avatar: m.user.avatar,
    gender: m.user.gender,
    subjects: coachSubjects[m.user.id] || [],
  }))

  return NextResponse.json(coaches)
}
