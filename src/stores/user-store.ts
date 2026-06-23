'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserInfo {
  id: number
  name: string
  phone: string
  role: string
  clubId: number | null
}

interface UserState {
  token: string | null
  user: UserInfo | null
  setAuth: (token: string, user: UserInfo) => void
  logout: () => void
  updateUser: (user: Partial<UserInfo>) => void
  getToken: () => string | null
  getUser: () => UserInfo | null
}

// 用于检测 hydration 是否完成
let _hasHydrated = false
let _onHydrateCallbacks: (() => void)[] = []

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token: string, user: UserInfo) => {
        set({ token, user })
      },

      logout: () => {
        set({ token: null, user: null })
        // 清除旧的 localStorage 数据
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('currentClubId')
      },

      updateUser: (userData: Partial<UserInfo>) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } })
        }
      },

      getToken: () => get().token,
      getUser: () => get().user,
    }),
    {
      name: 'user-storage',
      // 只持久化 token 和 user
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => {
        return (_state, _error) => {
          _hasHydrated = true
          // 通知所有等待 hydration 完成的回调
          _onHydrateCallbacks.forEach(cb => cb())
          _onHydrateCallbacks = []
        }
      },
    }
  )
)

/**
 * 等待 Zustand hydration 完成
 * 在客户端首次渲染时，persist 中间件需要从 localStorage 恢复状态
 */
export function waitForHydration(): Promise<void> {
  if (_hasHydrated) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    _onHydrateCallbacks.push(resolve)
  })
}

/**
 * 检查 hydration 是否已完成
 */
export function isHydrated(): boolean {
  return _hasHydrated
}
