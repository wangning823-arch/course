'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [authChecked, setAuthChecked] = React.useState(false)

  const isLoginPage = pathname === '/login'

  // 兼职教练和全职教练不允许访问的管理页面
  const coachBlockedPaths = ['/admin/users', '/admin/clubs', '/admin/campuses', '/admin/coach-prices']

  // 系统管理员不允许访问的页面（业务操作和俱乐部级别管理）
  const superAdminBlockedPaths = ['/schedule', '/lessons', '/admin/campuses', '/admin/subjects', '/admin/coach-prices']

  // 检查登录状态 + 设置页面标题
  React.useEffect(() => {
    if (isLoginPage) {
      document.title = '课时管理系统 - 登录'
      setAuthChecked(true)
      return
    }
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
    } else {
      setAuthChecked(true)
      // 根据用户角色设置标题
      const stored = localStorage.getItem('user')
      if (stored) {
        const user = JSON.parse(stored)

        // 兼职教练和全职教练不允许访问管理页面，重定向到首页
        if ((user.role === 'part_time_coach' || user.role === 'full_time_coach') && coachBlockedPaths.some(p => pathname.startsWith(p))) {
          router.replace('/')
          return
        }

        // 系统管理员不允许访问业务页面和俱乐部管理页面
        if (user.role === 'super_admin' && superAdminBlockedPaths.some(p => pathname.startsWith(p))) {
          router.replace('/')
          return
        }

        if (user.role === 'super_admin') {
          document.title = '课时管理系统'
        } else {
          // 俱乐部管理员或教练：获取所属俱乐部名称
          const clubId = user.clubId || localStorage.getItem('currentClubId')
          if (clubId) {
            fetch(`/api/clubs/${clubId}`)
              .then((res) => res.json())
              .then((club) => {
                document.title = club?.name ? `${club.name}课时管理系统` : '课时管理系统'
              })
              .catch(() => {
                document.title = '课时管理系统'
              })
          } else {
            document.title = '课时管理系统'
          }
        }
      }
    }
  }, [isLoginPage, router, pathname])

  React.useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(true)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 登录页面：不显示侧边栏和头部
  if (isLoginPage) {
    return (
      <html lang="zh-CN">
        <body className="min-h-screen bg-gray-50">
          {children}
        </body>
      </html>
    )
  }

  // 未登录或正在检查：显示空白
  if (!authChecked) {
    return (
      <html lang="zh-CN">
        <body className="min-h-screen bg-gray-50" />
      </html>
    )
  }

  const sidebarWidth = !mounted || !isMobile
    ? (sidebarOpen ? 224 : 64)
    : 0

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onClose={() => setSidebarOpen(false)}
        />
        <Header
          marginLeft={`${sidebarWidth}px`}
          onMenuClick={() => setSidebarOpen(true)}
          isMobile={isMobile}
        />
        <main
          className="pt-14 transition-all duration-300"
          style={{ marginLeft: `${sidebarWidth}px` }}
        >
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </body>
    </html>
  )
}
