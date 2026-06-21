'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, Menu } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const titleMap: Record<string, string> = {
  '/schedule': '排课管理',
  '/lessons': '课时记录',
  '/statistics': '课时统计',
  '/admin/users': '用户管理',
  '/admin/clubs': '俱乐部管理',
  '/admin/campuses': '校区管理',
  '/admin/subjects': '科目管理',
  '/admin/students': '学员管理',
  '/admin/coach-prices': '教练定价',
  '/profile': '个人中心',
}

interface HeaderProps {
  marginLeft: string
  onMenuClick?: () => void
  isMobile?: boolean
}

export function Header({ marginLeft, onMenuClick, isMobile }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const currentTitle = titleMap[pathname] || ''
  const [userName, setUserName] = React.useState('管理员')

  React.useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const u = JSON.parse(stored)
      if (u.name) setUserName(u.name)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <header
      className="fixed top-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30 transition-all duration-300"
      style={{ left: marginLeft }}
    >
      <div className="flex items-center gap-2 text-sm">
        {/* 手机端汉堡菜单 */}
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="mr-2">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Link href="/" className="text-gray-500 hover:text-gray-700">首页</Link>
        {currentTitle && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{currentTitle}</span>
          </>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-500 text-white text-sm">管</AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-700 hidden sm:inline">{userName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => router.push('/profile')}>个人中心</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={handleLogout}>退出登录</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
