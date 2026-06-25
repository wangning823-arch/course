import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/user/roles - 获取用户的有效角色（包含动态检测的双重身份）
// 返回 { roles: string[], primaryRole: string, isParent: boolean, isStudent: boolean, studentId?: number, studentClubId?: number }
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const primaryRole = authUser.role
  const roles = [primaryRole]
  let isParent = primaryRole === 'parent'
  let isStudent = primaryRole === 'student'
  let studentId: number | undefined
  let studentClubId: number | undefined

  // 检查是否同时是学员：Student 表中有 userId = 当前用户 ID 的记录
  const asStudent = await prisma.student.findFirst({
    where: { userId: authUser.userId },
    select: { id: true, clubId: true },
  })
  if (asStudent) {
    isStudent = true
    studentId = asStudent.id
    studentClubId = asStudent.clubId || undefined
    if (!roles.includes('student')) roles.push('student')
  }

  // 检查是否同时是家长：Student 表中有 parentId = 当前用户 ID 的记录
  const asParent = await prisma.student.findFirst({
    where: { parentId: authUser.userId },
    select: { id: true },
  })
  if (asParent) {
    isParent = true
    if (!roles.includes('parent')) roles.push('parent')
  }

  return NextResponse.json({
    primaryRole,
    roles,
    isParent,
    isStudent,
    studentId,
    studentClubId,
  })
}
