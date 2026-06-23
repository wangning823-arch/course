'use client'

import useSWR, { SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { authFetch } from '@/lib/fetch-client'

/**
 * 带鉴权的 fetcher
 */
const authFetcher = async (url: string) => {
  const res = await authFetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(error.error || '请求失败')
  }
  return res.json()
}

/**
 * 通用 mutation fetcher
 */
const mutationFetcher = async (url: string, { arg, method = 'POST' }: { arg?: unknown; method?: string }) => {
  const res = await authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: arg ? JSON.stringify(arg) : undefined,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(error.error || '请求失败')
  }
  return res.json()
}

/**
 * 默认 SWR 配置
 */
const defaultOptions: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 60秒内去重
  errorRetryCount: 2,
}

/**
 * 使用 SWR 获取数据的 hook
 * @param url API 地址，传 null 禁用请求
 * @param options SWR 配置
 */
export function useApi<T = any>(url: string | null, options?: SWRConfiguration) {
  return useSWR<T>(url, authFetcher, { ...defaultOptions, ...options })
}

/**
 * 带自动刷新的 API hook（用于实时数据）
 */
export function useApiWithRefresh<T = any>(url: string | null, refreshInterval: number = 60000) {
  return useApi<T>(url, { refreshInterval, revalidateOnFocus: true })
}

/**
 * POST mutation hook
 */
export function usePostApi<T = any>(url: string) {
  return useSWRMutation<T, any>(
    url,
    async (url: string, { arg }: { arg?: unknown }) => {
      const res = await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: arg ? JSON.stringify(arg) : undefined,
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: '请求失败' }))
        throw new Error(error.error || '请求失败')
      }
      return res.json()
    }
  )
}

/**
 * PUT mutation hook
 */
export function usePutApi<T = any>(url: string) {
  return useSWRMutation<T, any>(
    url,
    async (url: string, { arg }: { arg?: unknown }) => {
      const res = await authFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: arg ? JSON.stringify(arg) : undefined,
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: '请求失败' }))
        throw new Error(error.error || '请求失败')
      }
      return res.json()
    }
  )
}

/**
 * DELETE mutation hook
 */
export function useDeleteApi<T = any>(url: string) {
  return useSWRMutation<T, any>(
    url,
    async (url: string) => {
      const res = await authFetch(url, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: '请求失败' }))
        throw new Error(error.error || '请求失败')
      }
      return res.json()
    }
  )
}

/**
 * 手动触发重新验证
 */
export { mutate } from 'swr'

/**
 * 批量重新验证
 */
export function mutateAll(patterns: (string | RegExp)[]) {
  import('swr').then(({ mutate }) => {
    patterns.forEach(pattern => mutate(pattern as any))
  })
}
