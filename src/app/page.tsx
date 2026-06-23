'use client'

import * as React from 'react'
import Link from 'next/link'
import { Calendar, Timer, Users, BookOpen, ArrowRight, Building2, UserCog, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ClubSelector } from '@/components/club-selector'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const statusMap: Record<string, { label: string; variant: 'default' | 'success' | 'warning' }> = {
  completed: { label: '已完成', variant: 'success' },
  in_progress: { label: '进行中', variant: 'warning' },
  scheduled: { label: '待开始', variant: 'default' },
}

export default function HomePage() {
  const [courses, setCourses] = React.useState<any[]>([])
  const [stats, setStats] = React.useState({
    todayCourses: 0,
    weekLessons: 0,
    activeStudents: 0,
  })
  const [platformStats, setPlatformStats] = React.useState({
    totalClubs: 0,
    totalUsers: 0,
  })
  const [role, setRole] = React.useState('')
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false)
  const [selectedCourse, setSelectedCourse] = React.useState<any>(null)

  React.useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      if (user.role) setRole(user.role)
    }
  }, [])

  // 兼职教练的快捷操作
  const partTimeCoachQuickActions = [
    { label: '排课管理', href: '/schedule', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: '记录课时', href: '/lessons', color: 'bg-green-500 hover:bg-green-600' },
    { label: '查看统计', href: '/statistics', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { label: '学员管理', href: '/admin/students', color: 'bg-purple-500 hover:bg-purple-600' },
  ]

  // 俱乐部管理员的快捷操作
  const adminQuickActions = [
    { label: '排课管理', href: '/schedule', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: '记录课时', href: '/lessons', color: 'bg-green-500 hover:bg-green-600' },
    { label: '查看统计', href: '/statistics', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { label: '学员管理', href: '/admin/students', color: 'bg-purple-500 hover:bg-purple-600' },
  ]

  // 系统管理员的快捷操作
  const superAdminQuickActions = [
    { label: '统计概览', href: '/statistics', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: '学员查看', href: '/admin/students', color: 'bg-green-500 hover:bg-green-600' },
    { label: '俱乐部管理', href: '/admin/clubs', color: 'bg-purple-500 hover:bg-purple-600' },
    { label: '用户管理', href: '/admin/users', color: 'bg-yellow-500 hover:bg-yellow-600' },
  ]

  const getQuickActions = () => {
    if (role === 'part_time_coach') return partTimeCoachQuickActions
    if (role === 'super_admin') return superAdminQuickActions
    return adminQuickActions
  }

  // 获取业务数据（教练和俱乐部管理员）
  const fetchBusinessData = React.useCallback(() => {
    if (role === 'super_admin') return

    const clubId = localStorage.getItem('currentClubId')
    if (!clubId) return

    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : null

    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const startDate = `${year}-${month}-${day}`
    const endDate = startDate

    let courseUrl: string
    let statsUrl: string

    if (user?.role === 'part_time_coach' && user?.id) {
      // 兼职教练：只看自己的课程和统计，选择具体俱乐部时按俱乐部过滤
      courseUrl = `/api/courses?startDate=${startDate}&endDate=${endDate}&coachId=${user.id}`
      statsUrl = `/api/statistics?coachId=${user.id}&period=month`
      if (clubId && clubId !== 'all') {
        courseUrl += `&clubId=${clubId}`
        statsUrl += `&clubId=${clubId}`
      }
    } else {
      courseUrl = `/api/courses?clubId=${clubId}&startDate=${startDate}&endDate=${endDate}`
      statsUrl = `/api/statistics?clubId=${clubId}&period=month`
    }

    fetch(courseUrl)
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        setCourses(data)
        setStats((prev) => ({ ...prev, todayCourses: data.length }))
      })
      .catch(console.error)

    fetch(statsUrl)
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        setStats((prev) => ({
          ...prev,
          weekLessons: data.totalLessons,
          activeStudents: data.activeStudents,
        }))
      })
      .catch(console.error)
  }, [role])

  const handleCancelCourse = async () => {
    if (!selectedCourse) return

    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setCancelDialogOpen(false)
        setSelectedCourse(null)
        fetchBusinessData()
      }
    } catch (error) {
      console.error('取消课程失败:', error)
    }
  }

  // 获取平台数据（系统管理员）
  const fetchPlatformData = React.useCallback(() => {
    if (role !== 'super_admin') return

    Promise.all([
      fetch('/api/clubs').then((res) => res.json()),
      fetch('/api/users').then((res) => res.json()),
    ])
      .then(([clubs, users]) => {
        setPlatformStats({
          totalClubs: clubs.length,
          totalUsers: users.length,
        })
      })
      .catch(console.error)
  }, [role])

  React.useEffect(() => {
    fetchBusinessData()
    fetchPlatformData()

    const handleClubChanged = () => {
      fetchBusinessData()
      fetchPlatformData()
    }
    window.addEventListener('clubChanged', handleClubChanged)
    return () => window.removeEventListener('clubChanged', handleClubChanged)
  }, [fetchBusinessData, fetchPlatformData])

  const quickActions = getQuickActions()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {role === 'super_admin' ? '系统管理平台' : '欢迎使用俱乐部课时管理系统'}
        </h1>
        {role !== 'super_admin' && <ClubSelector />}
      </div>

      {/* 系统管理员 - 平台统计 */}
      {role === 'super_admin' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">俱乐部总数</p>
                  <p className="text-2xl font-bold mt-1">{platformStats.totalClubs}</p>
                </div>
                <Building2 className="h-12 w-12 text-blue-500 opacity-30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">用户总数</p>
                  <p className="text-2xl font-bold mt-1">{platformStats.totalUsers}</p>
                </div>
                <UserCog className="h-12 w-12 text-green-500 opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* 教练和俱乐部管理员 - 业务统计 */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/schedule">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">今日课程</p>
                    <p className="text-lg font-bold">{stats.todayCourses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/lessons">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500">本月课时</p>
                    <p className="text-lg font-bold">{stats.weekLessons}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/students">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-xs text-gray-500">活跃学员</p>
                    <p className="text-lg font-bold">{stats.activeStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/statistics">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-gray-500">课时统计</p>
                    <p className="text-lg font-bold">{stats.weekLessons}节</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Button className={`w-full ${action.color} text-white`}>
                  {action.label}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 今日课程 - 仅教练和俱乐部管理员 */}
      {role !== 'super_admin' && (
        <Card>
          <CardHeader>
            <CardTitle>今日课程</CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无今日课程</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>科目</TableHead>
                    <TableHead>教练</TableHead>
                    <TableHead className="hidden sm:table-cell">学员</TableHead>
                    <TableHead className="hidden md:table-cell">校区</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.startTime}-{course.endTime}</TableCell>
                      <TableCell>{course.subject}</TableCell>
                      <TableCell>{course.coach}</TableCell>
                      <TableCell className="hidden sm:table-cell">{course.students}</TableCell>
                      <TableCell className="hidden md:table-cell">{course.campus}</TableCell>
                      <TableCell>
                        <Badge variant={statusMap[course.status]?.variant || 'default'}>
                          {statusMap[course.status]?.label || course.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {course.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedCourse(course)
                              setCancelDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 取消课程确认弹窗 */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>取消课程</DialogTitle>
            <DialogDescription>
              确定要取消 {selectedCourse?.subject}（{selectedCourse?.startTime}-{selectedCourse?.endTime}）吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>返回</Button>
            <Button variant="destructive" onClick={handleCancelCourse}>确认取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
