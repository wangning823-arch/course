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

  // 只有管理员可以创建账号（全职教练无学员管理权限）
  if (!['super_admin', 'club_admin'].includes(authUser.role)) {
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

  let newUser: any
  let parentId: number | null = null

  if (studentType === 'minor') {
    // 未成年学员：家长手机号如果已有账号，直接关联；否则创建
    if (existingUser) {
      // 家长已有账号，直接关联
      parentId = existingUser.id
      newUser = existingUser
    } else {
      // 创建家长账号
      const passwordHash = await hashPassword(password)
      newUser = await prisma.user.create({
        data: {
          phone: loginPhone,
          name: student.parentName || `${student.name}的家长`,
          passwordHash,
          role: 'parent',
          gender: student.gender,
          birthDate: student.birthDate,
        },
      })
      parentId = newUser.id
    }
    // 关联家长账号
    await prisma.student.update({
      where: { id: studentId },
      data: { parentId },
    })
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
      },
      message: existingUser ? '已关联家长已有账号' : '家长账号创建成功',
    })
  } else {
    // 成年学员
    if (existingUser) {
      return NextResponse.json({ error: '该手机号已被其他账号使用' }, { status: 400 })
    }

    // 创建密码哈希
    const passwordHash = await hashPassword(password)

    // 创建学员用户
    newUser = await prisma.user.create({
      data: {
        phone: loginPhone,
        name: student.name,
        passwordHash,
        role: 'student',
        gender: student.gender,
        birthDate: student.birthDate,
      },
    })
    // 关联自己的账号
    await prisma.student.update({
      where: { id: studentId },
      data: { userId: newUser.id },
    })
  }

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
