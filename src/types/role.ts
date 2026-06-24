/**
 * 角色类型定义
 * 定义系统中所有用户角色及其相关常量
 */

// 角色常量
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CLUB_ADMIN: 'club_admin',
  FULL_TIME_COACH: 'full_time_coach',
  PART_TIME_COACH: 'part_time_coach',
  STUDENT: 'student',
  PARENT: 'parent',
} as const

export type UserRole = typeof ROLES[keyof typeof ROLES]

// 角色标签映射
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: '系统管理员',
  club_admin: '俱乐部管理员',
  full_time_coach: '全职教练',
  part_time_coach: '兼职教练',
  student: '学员',
  parent: '家长',
}

// 角色颜色映射（用于 Element Plus Tag 组件）
export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'danger',
  club_admin: 'warning',
  full_time_coach: 'success',
  part_time_coach: 'primary',
  student: 'info',
  parent: 'info',
}

/**
 * 判断是否为教练角色（兼职或全职）
 */
export function isCoach(role: string): boolean {
  return role === ROLES.PART_TIME_COACH || role === ROLES.FULL_TIME_COACH
}

/**
 * 判断是否为管理员角色（俱乐部管理员）
 * 注意：全职教练不等同于管理员，功能更受限
 */
export function isAdmin(role: string): boolean {
  return role === ROLES.CLUB_ADMIN
}

/**
 * 判断是否可以管理学员（非私有）
 * 只有俱乐部管理员可以管理
 */
export function canManageStudents(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.CLUB_ADMIN
}

/**
 * 判断是否可以创建私人科目
 * 只有兼职教练可以创建私人科目
 */
export function canCreatePrivateSubject(role: string): boolean {
  return role === ROLES.PART_TIME_COACH
}

/**
 * 判断是否可以创建私有学员
 * 只有兼职教练可以创建私有学员
 */
export function canCreatePrivateStudent(role: string): boolean {
  return role === ROLES.PART_TIME_COACH
}

/**
 * 判断是否可以查看所有教练数据
 * 只有俱乐部管理员可以查看
 * 全职教练只能看自己的数据
 */
export function canViewAllCoaches(role: string): boolean {
  return role === ROLES.CLUB_ADMIN
}

/**
 * 判断是否可以访问用户管理
 * 只有超管和俱乐部管理员可以访问
 */
export function canAccessUserManagement(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.CLUB_ADMIN
}

/**
 * 判断是否可以访问系统管理功能
 * 只有超管和俱乐部管理员可以访问
 * 全职教练不能访问系统管理
 */
export function canAccessSystemManagement(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.CLUB_ADMIN
}

/**
 * 判断是否可以创建私人功能（科目或学员）
 * 只有兼职教练可以创建
 */
export function canCreatePrivate(role: string): boolean {
  return role === ROLES.PART_TIME_COACH
}

/**
 * 判断是否为学员角色
 */
export function isStudent(role: string): boolean {
  return role === ROLES.STUDENT
}

/**
 * 判断是否为家长角色
 */
export function isParent(role: string): boolean {
  return role === ROLES.PARENT
}

/**
 * 判断是否为学员或家长角色
 */
export function isStudentOrParent(role: string): boolean {
  return role === ROLES.STUDENT || role === ROLES.PARENT
}
