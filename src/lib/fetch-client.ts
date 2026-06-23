/**
 * 带鉴权的 fetch 封装，自动从 Zustand store 读取 token 并添加 Authorization 头
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // 动态导入避免 SSR 问题
  const { useUserStore } = await import('@/stores/user-store')
  const token = useUserStore.getState().token

  const headers: Record<string, string> = {}

  // 复制原有 headers
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => { headers[k] = v })
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => { headers[k] = v })
    } else {
      Object.assign(headers, options.headers)
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, { ...options, headers })
}
