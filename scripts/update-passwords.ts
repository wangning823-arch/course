import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始更新用户密码哈希...')

  // 获取所有用户
  const users = await prisma.user.findMany({
    select: { id: true, phone: true, passwordHash: true },
  })

  console.log(`找到 ${users.length} 个用户`)

  // 默认密码
  const defaultPassword = '123456'
  const bcryptHash = await bcrypt.hash(defaultPassword, 10)

  // 更新每个用户的密码
  for (const user of users) {
    // 检查是否已经是 bcrypt 哈希（以 $2 开头）
    if (user.passwordHash && !user.passwordHash.startsWith('$2')) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: bcryptHash },
      })
      console.log(`已更新用户 ${user.phone} 的密码`)
    } else if (!user.passwordHash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: bcryptHash },
      })
      console.log(`已为用户 ${user.phone} 设置默认密码`)
    } else {
      console.log(`用户 ${user.phone} 的密码已是 bcrypt 格式，跳过`)
    }
  }

  console.log('密码更新完成！')
  console.log(`所有用户的默认密码为: ${defaultPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
