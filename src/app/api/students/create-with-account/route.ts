import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

// POST /api/students/create-with-account - 同时创建学员信息和登录账号
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 管理员、全职教练、兼职教练都可以创建学员
    if (!['super_admin', 'club_admin', 'full_time_coach', 'part_time_coach'].includes(authUser.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const {
      name,
      phone,
      gender,
      birthDate,
      parentName,
      parentPhone,
      studentType,
      clubId,
      coachId,  // 新增：教练ID，用于兼职教练创建私有学员
      password,
    } = await request.json()

    if (!name) {
      return NextResponse.json({ error: '请填写学员姓名' }, { status: 400 })
    }

    // 根据学员类型验证必填字段
    if (studentType === 'adult' && !phone) {
      return NextResponse.json({ error: '请填写学员手机号' }, { status: 400 })
    }

    if (studentType === 'minor' && !parentPhone) {
      return NextResponse.json({ error: '请填写家长手机号' }, { status: 400 })
    }

    // 确定登录手机号
    const loginPhone = studentType === 'minor' ? parentPhone : phone

    // 检查手机号是否已有用户
    let existingUser = null
    if (loginPhone) {
      existingUser = await prisma.user.findUnique({
        where: { phone: loginPhone },
      })
    }

    let userId: number | null = null
    let parentId: number | null = null

    // 定义不能作为学员添加的角色
    const nonStudentRoles = ['super_admin', 'club_admin', 'full_time_coach', 'part_time_coach']

    if (studentType === 'adult') {
      // 成年学员
      if (existingUser) {
        // 检查该用户是否是教练或管理员
        if (nonStudentRoles.includes(existingUser.role)) {
          return NextResponse.json({ error: '该手机号是教练或管理员，不能作为学员添加' }, { status: 400 })
        }
        // 手机号已有用户（别的俱乐部学员），不创建新用户
        userId = existingUser.id
      } else {
        // 手机号没有用户，需要创建学员账户
        if (!password) {
          return NextResponse.json({ error: '该手机号没有用户，请设置登录密码' }, { status: 400 })
        }
        if (password.length < 6) {
          return NextResponse.json({ error: '密码至少需要6位' }, { status: 400 })
        }

        // 创建密码哈希
        const passwordHash = await hashPassword(password)

        // 创建学员用户
        const newUser = await prisma.user.create({
          data: {
            phone,
            name,
            passwordHash,
            role: 'student',
            gender: gender ? parseInt(String(gender)) : null,
            birthDate: birthDate ? new Date(birthDate) : null,
          },
        })
        userId = newUser.id
        console.log('用户创建成功:', { userId, phone, name, role: 'student' })
      }
    } else {
      // 未成年学员
      if (existingUser) {
        // 家长手机号已有用户，直接关联
        parentId = existingUser.id
      } else {
        // 家长手机号没有用户，创建家长账号
        if (!password) {
          return NextResponse.json({ error: '该家长手机号没有用户，请设置登录密码' }, { status: 400 })
        }
        if (password.length < 6) {
          return NextResponse.json({ error: '密码至少需要6位' }, { status: 400 })
        }

        const passwordHash = await hashPassword(password)
        const newUser = await prisma.user.create({
          data: {
            phone: parentPhone,
            name: parentName || `${name}的家长`,
            passwordHash,
            role: 'parent',
            gender: gender ? parseInt(String(gender)) : null,
          },
        })
        parentId = newUser.id
        console.log('家长用户创建成功:', { parentId, phone: parentPhone, name: parentName || `${name}的家长` })
      }
    }

    // 检查是否已有该用户的学员记录（避免重复创建）
    if (userId) {
      const existingStudent = await prisma.student.findFirst({
        where: { userId },
      })
      if (existingStudent) {
        return NextResponse.json({
          error: `该手机号的学员"${existingStudent.name}"已存在，无需重复创建`,
        }, { status: 400 })
      }
    }
    if (parentId) {
      const existingStudent = await prisma.student.findFirst({
        where: { parentId },
      })
      if (existingStudent) {
        return NextResponse.json({
          error: `该家长手机号的学员"${existingStudent.name}"已存在，无需重复创建`,
        }, { status: 400 })
      }
    }

    // 验证 clubId 是否有效（如果提供了的话）
    const parsedClubId = clubId ? parseInt(String(clubId)) : null
    if (parsedClubId && !isNaN(parsedClubId)) {
      const clubExists = await prisma.club.findUnique({ where: { id: parsedClubId } })
      if (!clubExists) {
        console.error('俱乐部不存在:', parsedClubId)
        return NextResponse.json({ error: `俱乐部ID ${parsedClubId} 不存在` }, { status: 400 })
      }
    } else if (parsedClubId && isNaN(parsedClubId)) {
      console.error('无效的俱乐部ID:', clubId)
      return NextResponse.json({ error: '无效的俱乐部ID' }, { status: 400 })
    }

    // 确定 coachId：
    // - 兼职教练：如果传入了 coachId，则使用传入的值
    // - 管理员/全职教练：coachId 由后续分配逻辑决定
    const parsedCoachId = authUser.role === 'part_time_coach'
      ? (coachId ? parseInt(String(coachId)) : authUser.userId)
      : (coachId ? parseInt(String(coachId)) : null)

    // 创建学员记录
    const student = await prisma.student.create({
      data: {
        clubId: parsedClubId,
        coachId: parsedClubId ? parsedCoachId : authUser.userId,  // 纯私有学员：coachId = 当前教练
        userId: userId,
        parentId: parentId,
        studentType: studentType || 'adult',
        name,
        phone: phone || null,
        gender: gender ? parseInt(String(gender)) : null,
        birthDate: birthDate ? new Date(birthDate) : null,
        parentName: parentName || null,
        parentPhone: parentPhone || null,
      },
    })

    console.log('学员创建成功:', { id: student.id, name, clubId: parsedClubId, userId, parentId })

    // 确定返回消息
    let message = '学员创建成功'
    if (studentType === 'adult') {
      message = existingUser ? '学员创建成功，已关联已有用户' : '学员和登录账号创建成功'
    } else {
      message = parentId ? '学员创建成功，已关联家长账号' : '学员创建成功'
    }

    return NextResponse.json({
      success: true,
      student,
      message,
    }, { status: 201 })
  } catch (error: any) {
    console.error('创建学员失败:', error)
    console.error('错误详情:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack?.split('\n').slice(0, 5),
    })
    return NextResponse.json({ error: '创建失败，请稍后重试', detail: error?.message }, { status: 500 })
  }
}
