'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Calendar, Timer, BarChart3, Settings, Users, Building2,
  MapPin, BookOpen, GraduationCap, DollarSign, ChevronDown, ChevronLeft, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onToggle: () => void
  onClose: () => void
}

const menuItems = [
  { icon: Home, label: '首页', href: '/' },
  { icon: Calendar, label: '排课管理', href: '/schedule' },
  { icon: Timer, label: '课时记录', href: '/lessons' },
  { icon: BarChart3, label: '课时统计', href: '/statistics' },
]

const adminItems = [
  { icon: Users, label: '用户管理', href: '/admin/users' },
  { icon: Building2, label: '俱乐部管理', href: '/admin/clubs' },
  { icon: MapPin, label: '校区管理', href: '/admin/campuses' },
  { icon: BookOpen, label: '科目管理', href: '/admin/subjects' },
  { icon: GraduationCap, label: '学员管理', href: '/admin/students' },
  { icon: DollarSign, label: '教练定价', href: '/admin/coach-prices' },
]

export function Sidebar({ open, onToggle, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [adminOpen, setAdminOpen] = React.useState(true)
  const [logoText, setLogoText] = React.useState('课时管理系统')

  React.useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      if (user.role !== 'super_admin') {
        fetch('/api/clubs')
          .then((res) => res.json())
          .then((clubs) => {
            if (clubs.length > 0) {
              setLogoText(`${clubs[0].name}`)
            }
          })
          .catch(() => {})
      }
    }
  }, [])

  return (
    <>
      {/* 遮罩层 - 仅移动端在侧边栏打开时显示 */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* 侧边栏本体 */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 bg-[#001529] text-white flex flex-col',
          // 宽度：桌面端 open=224px, close=64px；移动端始终 224px
          open ? 'w-56' : 'md:w-16',
          // 移动端用 translate 控制显隐；桌面端始终显示
          'md:translate-x-0 transition-all duration-300',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
          {open && <span className="font-bold text-lg truncate">{logoText}</span>}
          <button onClick={onToggle} className="text-white/60 hover:text-white p-1">
            {open ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5 rotate-180" />
            )}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-2">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                    )}
                    title={!open ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {open && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}

            {/* Admin submenu */}
            <li>
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm w-full transition-colors',
                  'text-white/60 hover:bg-white/5 hover:text-white'
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
                {open && (
                  <>
                    <span className="flex-1 text-left">系统管理</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', adminOpen && 'rotate-180')} />
                  </>
                )}
              </button>
              {adminOpen && open && (
                <ul className="ml-4 mt-1 space-y-1">
                  {adminItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2 text-sm rounded-md transition-colors',
                            isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </aside>
    </>
  )
}
