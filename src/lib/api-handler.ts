import { NextRequest, NextResponse } from 'next/server'

/**
 * 标准化API错误响应
 */
export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

/**
 * 创建错误响应
 */
export function apiError(message: string, status: number = 400, code?: string): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, code },
    { status }
  )
}

/**
 * 创建成功响应
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}

/**
 * API路由处理器类型
 */
type ApiHandler = (request: NextRequest, context?: any) => Promise<NextResponse>

/**
 * 统一错误处理的API路由包装器
 * 自动捕获异常并返回标准化错误响应
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, error)

      // Prisma 错误处理
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string; meta?: any; message: string }

        // 唯一约束冲突
        if (prismaError.code === 'P2002') {
          const field = prismaError.meta?.target?.[0] || '数据'
          return apiError(`${field}已存在`, 400, 'DUPLICATE')
        }

        // 记录未找到
        if (prismaError.code === 'P2025') {
          return apiError('记录不存在', 404, 'NOT_FOUND')
        }

        // 外键约束
        if (prismaError.code === 'P2003') {
          return apiError('关联数据不存在', 400, 'FOREIGN_KEY')
        }
      }

      // 业务错误（通过 throw new Error('XXX') 抛出）
      if (error instanceof Error) {
        // 冲突检测错误
        if (error.message.startsWith('CONFLICT_')) {
          return apiError(error.message, 400, error.message)
        }

        // 其他业务错误
        if (error.message.startsWith('BUSINESS_')) {
          return apiError(error.message, 400, error.message)
        }

        // 权限错误
        if (error.message.startsWith('AUTH_')) {
          return apiError(error.message, 403, error.message)
        }
      }

      // 未知错误
      return apiError('服务器内部错误', 500, 'INTERNAL_ERROR')
    }
  }
}

/**
 * 需要认证的API路由包装器
 * 自动验证用户身份，未认证返回401
 */
export function withAuth(handler: ApiHandler): ApiHandler {
  return withErrorHandling(async (request: NextRequest, context?: any) => {
    const { getAuthUser } = await import('@/lib/auth')
    const authUser = await getAuthUser(request)

    if (!authUser) {
      return apiError('未登录或登录已过期', 401, 'UNAUTHORIZED')
    }

    // 将 authUser 添加到 request 的 context 中
    return handler(request, { ...context, authUser })
  })
}

/**
 * 需要特定角色的API路由包装器
 */
export function withRole(roles: string[], handler: ApiHandler): ApiHandler {
  return withAuth(async (request: NextRequest, context?: any) => {
    const { authUser } = context

    if (!roles.includes(authUser.role)) {
      return apiError('无权执行此操作', 403, 'FORBIDDEN')
    }

    return handler(request, context)
  })
}
