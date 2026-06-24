'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Calendar, Timer, BarChart3, Settings, Users, Building2,
  MapPin, BookOpen, GraduationCap, DollarSign, ChevronDown, ChevronLeft,
  MessageSquare, CalendarPlus, User, Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/user-store'
import { useClubStore } from '@/stores/club-store'
import { authFetch } from '@/lib/fetch-client'

interface SidebarProps {
  open: boolean
  onToggle: () => void
  onClose: () => void
}

// 主菜单（所有角色都有）
const mainMenuItems = [
  { icon: Home, label: '首页', href: '/' },
]

// 学员角色菜单
const studentMenuItems = [
  { icon: Calendar, label: '我的课程', href: '/student/courses' },
  { icon: Timer, label: '课时记录', href: '/student/lessons' },
  { icon: BarChart3, label: '学习统计', href: '/student/stats' },
  { icon: CalendarPlus, label: '预约教练', href: '/student/book' },
  { icon: User, label: '个人中心', href: '/student/profile' },
]

// 家长角色菜单
const parentMenuItems = [
  { icon: Users, label: '孩子管理', href: '/parent/children' },
  { icon: Calendar, label: '课程查看', href: '/student/courses' },
  { icon: CalendarPlus, label: '预约课程', href: '/parent/book' },
]

// 兼职教练角色专属菜单
const partTimeCoachMenuItems = [
  { icon: Calendar, label: '排课管理', href: '/schedule' },
  { icon: Timer, label: '课时记录', href: '/lessons' },
  { icon: BarChart3, label: '课时统计', href: '/statistics' },
  { icon: BookOpen, label: '科目管理', href: '/admin/subjects' },
  { icon: GraduationCap, label: '学员管理', href: '/admin/students' },
]

// 全职教练角色菜单（不能访问系统管理，无学员管理权限）
const fullTimeCoachMenuItems = [
  { icon: Calendar, label: '排课管理', href: '/schedule' },
  { icon: Timer, label: '课时记录', href: '/lessons' },
  { icon: BarChart3, label: '课时统计', href: '/statistics' },
  { icon: BookOpen, label: '科目管理', href: '/admin/subjects' },
]

// 管理员角色菜单（club_admin + super_admin）
const adminMenuItems = [
  { icon: Calendar, label: '排课管理', href: '/schedule' },
  { icon: Timer, label: '课时记录', href: '/lessons' },
  { icon: BarChart3, label: '课时统计', href: '/statistics' },
]

// 系统管理菜单
const systemAdminItems = {
  super_admin: [
    { icon: BarChart3, label: '统计概览', href: '/statistics' },
    { icon: GraduationCap, label: '学员查看', href: '/admin/students' },
    { icon: Users, label: '用户管理', href: '/admin/users' },
    { icon: Building2, label: '俱乐部管理', href: '/admin/clubs' },
    { icon: MessageSquare, label: '反馈管理', href: '/admin/feedback' },
  ],
  club_admin: [
    { icon: Users, label: '用户管理', href: '/admin/users' },
    { icon: MapPin, label: '校区管理', href: '/admin/campuses' },
    { icon: BookOpen, label: '科目管理', href: '/admin/subjects' },
    { icon: GraduationCap, label: '学员管理', href: '/admin/students' },
    { icon: DollarSign, label: '教练定价', href: '/admin/coach-prices' },
  ],
}

export function Sidebar({ open, onToggle, onClose }: SidebarProps) {
  const pathname = usePathname()
  const user = useUserStore((s) => s.user)
  const currentClubId = useClubStore((s) => s.currentClubId)
  const [adminOpen, setAdminOpen] = React.useState(true)
  const [logoText, setLogoText] = React.useState('课时管理系统')

  const role = user?.role || ''

  React.useEffect(() => {
    if (user && user.role !== 'super_admin') {
      // 从用户信息中获取 clubId，查对应俱乐部名称
      const clubId = user.clubId || (currentClubId && currentClubId !== 'all' ? currentClubId : null)
      if (clubId) {
        authFetch(`/api/clubs/${clubId}`)
          .then((res) => res.json())
          .then((club) => {
            if (club?.name) {
              setLogoText(club.name)
            }
          })
          .catch(() => {})
      }
    }
  }, [user, currentClubId])

  // 根据角色选择菜单
  const getMainItems = () => {
    if (role === 'student') return [...mainMenuItems, ...studentMenuItems]
    if (role === 'parent') return [...mainMenuItems, ...parentMenuItems]
    if (role === 'coach' || role === 'part_time_coach') return [...mainMenuItems, ...partTimeCoachMenuItems]
    if (role === 'full_time_coach') return [...mainMenuItems, ...fullTimeCoachMenuItems]
    if (role === 'super_admin') return mainMenuItems // 系统管理员只有首页
    return [...mainMenuItems, ...adminMenuItems]
  }

  const getSystemItems = () => {
    return systemAdminItems[role as keyof typeof systemAdminItems] || []
  }

  const mainItems = getMainItems()
  const sysItems = getSystemItems()

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
          open ? 'w-56' : 'md:w-16',
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
            {/* 主菜单 */}
            {mainItems.map((item) => {
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

            {/* 系统管理子菜单 - 仅管理员 */}
            {sysItems.length > 0 && (
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
                    {sysItems.map((item) => {
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
            )}
          </ul>
        </nav>

        {/* 底部固定菜单 - 意见反馈（系统管理员不显示） */}
        {role !== 'super_admin' && (
        <div className="border-t border-white/10 py-2">
          <Link
            href="/feedback"
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
              pathname === '/feedback' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
            )}
            title={!open ? '意见反馈' : undefined}
          >
            <MessageSquare className="h-5 w-5 shrink-0" />
            {open && <span>意见反馈</span>}
          </Link>
        </div>
        )}
      </aside>
    </>
  )
}
