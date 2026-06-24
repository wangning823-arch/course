import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// POST /api/students/check-phone - 检查手机号是否已有用户
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: '请提供手机号' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        gender: true,
        birthDate: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ exists: false })
    }

    // 定义不能作为学员添加的角色
    const nonStudentRoles = ['super_admin', 'club_admin', 'full_time_coach', 'part_time_coach']

    if (nonStudentRoles.includes(existingUser.role)) {
      return NextResponse.json({
        exists: true,
        canAdd: false,
        error: '该手机号是教练或管理员，不能作为学员添加',
        user: existingUser,
      })
    }

    // 可以作为学员添加（已有学员账号）
    return NextResponse.json({
      exists: true,
      canAdd: true,
      user: existingUser,
    })
  } catch (error) {
    console.error('检查手机号失败:', error)
    return NextResponse.json({ error: '检查失败，请稍后重试' }, { status: 500 })
  }
}
