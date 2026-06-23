import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * 密码哈希（使用 bcrypt，自动加盐）
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
