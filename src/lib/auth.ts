import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export interface AuthUser {
  userId: number
  phone: string
  role: string
  clubId: number | null
}

/**
 * 从请求头的 Authorization 中解析当前登录用户信息
 * token 格式: JWT ({ userId, phone })
 * 用户的 role 和 clubId 从数据库查询（更安全）
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  try {
    const token = authHeader.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload) return null

    // 从数据库查 role 和 clubId（不信任客户端）
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    })
    if (!user) return null

    let clubId: number | null = null
    if (user.role !== 'super_admin') {
      const membership = await prisma.clubMember.findFirst({
        where: { userId: user.id },
        select: { clubId: true },
      })
      clubId = membership?.clubId ?? null
    }

    return { userId: user.id, phone: payload.phone, role: user.role, clubId }
  } catch {
    return null
  }
}
