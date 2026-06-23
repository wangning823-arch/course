'use client'

import useSWR, { SWRConfiguration } from 'swr'
import { authFetch } from '@/lib/fetch-client'

/**
 * 通用数据获取 hook（带缓存）
 * @param url API 地址
 * @param options SWR 配置
 */
export function useFetch<T = any>(
  url: string | null,
  options?: SWRConfiguration<T>
) {
  const fetcher = async (url: string): Promise<T> => {
    const res = await authFetch(url)
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: '请求失败' }))
      throw new Error(error.error || '请求失败')
    }
    return res.json()
  }

  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 2000, // 2秒内相同请求去重
    ...options,
  })
}

/**
 * 不带鉴权的数据获取 hook
 */
export function usePublicFetch<T = any>(
  url: string | null,
  options?: SWRConfiguration<T>
) {
  const fetcher = async (url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: '请求失败' }))
      throw new Error(error.error || '请求失败')
    }
    return res.json()
  }

  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 2000,
    ...options,
  })
}
