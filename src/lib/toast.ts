'use client'

import { toast } from 'sonner'

/**
 * 成功提示
 */
export function showSuccess(message: string) {
  toast.success(message)
}

/**
 * 错误提示
 */
export function showError(message: string) {
  toast.error(message)
}

/**
 * 警告提示
 */
export function showWarning(message: string) {
  toast.warning(message)
}

/**
 * 信息提示
 */
export function showInfo(message: string) {
  toast.info(message)
}

/**
 * 确认对话框（异步）
 * 注意：sonner不原生支持confirm，使用window.confirm作为fallback
 */
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    resolve(window.confirm(message))
  })
}
