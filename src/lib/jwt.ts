import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production'
// 7天 = 7 * 24 * 60 * 60 = 604800秒
const JWT_EXPIRES_IN_SECONDS = 604800

export interface JwtPayload {
  userId: number
  phone: string
}

/**
 * 签发 JWT Token
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN_SECONDS })
}

/**
 * 验证 JWT Token
 * @returns 解码后的 payload 或 null（验证失败）
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return { userId: decoded.userId, phone: decoded.phone }
  } catch {
    return null
  }
}
