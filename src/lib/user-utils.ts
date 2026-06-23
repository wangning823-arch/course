'use client'

import { UserInfo } from '@/stores/user-store'

/**
 * 安全地从 localStorage 获取用户信息（向后兼容）
 * @deprecated 请使用 useUserStore()
 */
export function getStoredUser(): UserInfo | null {
  try {
    const stored = localStorage.getItem('user')
    if (!stored) return null
    return JSON.parse(stored) as UserInfo
  } catch {
    return null
  }
}

/**
 * 获取当前用户的角色
 */
export function getUserRole(): string | null {
  const user = getStoredUser()
  return user?.role || null
}

/**
 * 判断是否为超级管理员
 */
export function isSuperAdmin(): boolean {
  return getUserRole() === 'super_admin'
}

/**
 * 判断是否为俱乐部管理员
 */
export function isClubAdmin(): boolean {
  return getUserRole() === 'club_admin'
}

/**
 * 判断是否为教练（全职或兼职）
 */
export function isCoach(): boolean {
  const role = getUserRole()
  return role === 'full_time_coach' || role === 'part_time_coach'
}
