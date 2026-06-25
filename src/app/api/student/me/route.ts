import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/student/me - 获取当前用户作为学员的基本信息（studentId 和 clubId）
// 支持 student 和 parent 角色（家长可能同时也是学员）
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  if (authUser.role !== 'student' && authUser.role !== 'parent') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  // 通过 userId 查找学员记录（家长如果同时也是学员，会有对应的 Student 记录）
  const student = await prisma.student.findFirst({
    where: { userId: authUser.userId },
    select: { id: true, clubId: true },
  })

  if (!student) {
    return NextResponse.json({ isStudent: false })
  }

  return NextResponse.json({ isStudent: true, id: student.id, clubId: student.clubId })
}
