import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

async function main() {
  console.log('开始填充数据库...')

  const defaultPassword = hashPassword('123456')

  // 创建系统管理员
  const admin = await prisma.user.create({
    data: {
      phone: '13800000001',
      name: '系统管理员',
      role: 'super_admin',
      gender: 1,
      passwordHash: defaultPassword,
    },
  })

  // 创建俱乐部管理员
  const clubAdmin = await prisma.user.create({
    data: {
      phone: '13800000002',
      name: '张管理',
      role: 'club_admin',
      gender: 1,
      passwordHash: defaultPassword,
    },
  })

  // 创建教练
  const coach1 = await prisma.user.create({
    data: {
      phone: '13800000003',
      name: '张教练',
      role: 'coach',
      gender: 1,
      passwordHash: defaultPassword,
    },
  })

  const coach2 = await prisma.user.create({
    data: {
      phone: '13800000004',
      name: '李教练',
      role: 'coach',
      gender: 1,
      passwordHash: defaultPassword,
    },
  })

  const coach3 = await prisma.user.create({
    data: {
      phone: '13800000005',
      name: '王教练',
      role: 'coach',
      gender: 2,
      passwordHash: defaultPassword,
    },
  })

  // 创建俱乐部
  const club = await prisma.club.create({
    data: {
      name: '阳光俱乐部',
      description: '专业青少年体育培训',
      address: '市中心路100号',
      phone: '021-12345678',
      adminId: clubAdmin.id,
    },
  })

  // 创建俱乐部成员
  await prisma.clubMember.createMany({
    data: [
      { clubId: club.id, userId: clubAdmin.id, role: 'admin' },
      { clubId: club.id, userId: coach1.id, role: 'coach' },
      { clubId: club.id, userId: coach2.id, role: 'coach' },
      { clubId: club.id, userId: coach3.id, role: 'coach' },
    ],
  })

  // 创建校区
  const campus1 = await prisma.campus.create({
    data: {
      clubId: club.id,
      name: '主校区',
      address: '市中心路100号',
    },
  })

  const campus2 = await prisma.campus.create({
    data: {
      clubId: club.id,
      name: '分校区',
      address: '开发区路200号',
    },
  })

  // 创建科目
  const subject1 = await prisma.subject.create({
    data: {
      clubId: club.id,
      name: '篮球',
      category: '球类',
      teachingMode: 'group',
      durationMinutes: 60,
      price: 100,
    },
  })

  const subject2 = await prisma.subject.create({
    data: {
      clubId: club.id,
      name: '足球',
      category: '球类',
      teachingMode: 'group',
      durationMinutes: 90,
      price: 120,
    },
  })

  const subject3 = await prisma.subject.create({
    data: {
      clubId: club.id,
      name: '游泳',
      category: '水上',
      teachingMode: 'private',
      durationMinutes: 60,
      price: 200,
    },
  })

  // 创建教练定价（俱乐部+教练+科目+授课模式 = 价格）
  await prisma.coachPrice.createMany({
    data: [
      // 张教练：篮球
      { clubId: club.id, coachId: coach1.id, subjectId: subject1.id, teachingMode: 'private', price: 150 },
      { clubId: club.id, coachId: coach1.id, subjectId: subject1.id, teachingMode: 'group', price: 100 },
      // 李教练：足球
      { clubId: club.id, coachId: coach2.id, subjectId: subject2.id, teachingMode: 'private', price: 180 },
      { clubId: club.id, coachId: coach2.id, subjectId: subject2.id, teachingMode: 'group', price: 120 },
      // 王教练：游泳
      { clubId: club.id, coachId: coach3.id, subjectId: subject3.id, teachingMode: 'private', price: 250 },
    ],
  })

  // 创建学员
  const student1 = await prisma.student.create({
    data: {
      clubId: club.id,
      name: '李明',
      phone: '13900000001',
      gender: 1,
      parentName: '李父',
      parentPhone: '13900000011',
    },
  })

  const student2 = await prisma.student.create({
    data: {
      clubId: club.id,
      name: '王强',
      phone: '13900000002',
      gender: 1,
      parentName: '王父',
      parentPhone: '13900000012',
    },
  })

  const student3 = await prisma.student.create({
    data: {
      clubId: club.id,
      coachId: coach1.id,  // 陈静是张教练的私有学员
      name: '陈静',
      phone: '13900000003',
      gender: 2,
      parentName: '陈母',
      parentPhone: '13900000013',
    },
  })

  console.log('数据库填充完成！')
  console.log(`- ${await prisma.user.count()} 个用户`)
  console.log(`- ${await prisma.club.count()} 个俱乐部`)
  console.log(`- ${await prisma.campus.count()} 个校区`)
  console.log(`- ${await prisma.subject.count()} 个科目`)
  console.log(`- ${await prisma.student.count()} 个学员`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
