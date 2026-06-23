import { NextRequest, NextResponse } from 'next/server'

// 不需要认证的API路径
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/send-code',
]

/**
 * 全局认证中间件
 * 拦截所有API请求，未登录用户返回401
 * 注意: Edge Runtime 不支持 jsonwebtoken，完整JWT验证在各 API 路由中通过 getAuthUser 实现
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 只拦截API请求
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 公开接口放行
  if (PUBLIC_API_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 检查Authorization头
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: '未登录，请先登录' },
      { status: 401 }
    )
  }

  // 基本token格式验证（JWT格式: xxx.yyy.zzz）
  const token = authHeader.replace('Bearer ', '')
  const parts = token.split('.')
  if (parts.length !== 3) {
    return NextResponse.json(
      { error: '无效的认证令牌' },
      { status: 401 }
    )
  }

  // 验证每个部分不为空
  if (!parts[0] || !parts[1] || !parts[2]) {
    return NextResponse.json(
      { error: '无效的认证令牌' },
      { status: 401 }
    )
  }

  // Token格式验证通过，放行（完整JWT验证在API路由中通过 getAuthUser 实现）
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
