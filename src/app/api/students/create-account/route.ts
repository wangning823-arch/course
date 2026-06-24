import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

// POST /api/students/create-account - 为学员创建登录账号
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  // 只有管理员可以创建账号
  if (!['super_admin', 'club_admin', 'full_time_coach'].includes(authUser.role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { studentId, phone, password, studentType, parentPhone } = await request.json()

  if (!studentId || !password) {
    return NextResponse.json({ error: '请提供学员ID和密码' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: '密码至少需要6位' }, { status: 400 })
  }

  // 查找学员
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  })

  if (!student) {
    return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  }

  if (student.userId) {
    return NextResponse.json({ error: '该学员已有登录账号' }, { status: 400 })
  }

  // 确定登录手机号
  const loginPhone = studentType === 'minor' ? parentPhone : phone
  if (!loginPhone) {
    return NextResponse.json({ error: '请提供登录手机号' }, { status: 400 })
  }

  // 检查手机号是否已被使用
  const existingUser = await prisma.user.findUnique({
    where: { phone: loginPhone },
  })

  if (existingUser) {
    return NextResponse.json({ error: '该手机号已被其他账号使用' }, { status: 400 })
  }

  // 创建密码哈希
  const passwordHash = await hashPassword(password)

  // 创建用户账号
  const role = studentType === 'minor' ? 'parent' : 'student'
  const newUser = await prisma.user.create({
    data: {
      phone: loginPhone,
      name: studentType === 'minor' ? (student.parentName || `${student.name}的家长`) : student.name,
      passwordHash,
      role,
      gender: student.gender,
      birthDate: student.birthDate,
    },
  })

  // 更新学员记录，关联用户账号
  if (studentType === 'minor') {
    // 未成年学员：关联家长账号
    await prisma.student.update({
      where: { id: studentId },
      data: { parentId: newUser.id },
    })
  } else {
    // 成年学员：关联自己的账号
    await prisma.student.update({
      where: { id: studentId },
      data: { userId: newUser.id },
    })
  }

  return NextResponse.json({
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      phone: newUser.phone,
      role: newUser.role,
    },
  })
}
