'use client'

import { SWRConfiguration } from 'swr'
import { authFetch } from './fetch-client'

/**
 * 带鉴权的 fetcher
 */
export const authFetcher = async (url: string) => {
  const res = await authFetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(error.error || '请求失败')
  }
  return res.json()
}

/**
 * 默认 SWR 配置
 */
export const defaultSWROptions: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 60秒内去重
  errorRetryCount: 2,
}
