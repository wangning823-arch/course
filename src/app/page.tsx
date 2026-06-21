'use client'

import * as React from 'react'
import Link from 'next/link'
import { Calendar, Timer, Users, DollarSign, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const quickActions = [
  { label: '排课管理', href: '/schedule', color: 'bg-blue-500 hover:bg-blue-600' },
  { label: '记录课时', href: '/lessons', color: 'bg-green-500 hover:bg-green-600' },
  { label: '查看统计', href: '/statistics', color: 'bg-yellow-500 hover:bg-yellow-600' },
  { label: '学员管理', href: '/admin/students', color: 'bg-purple-500 hover:bg-purple-600' },
]

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
    monthIncome: 0,
  })

  const fetchData = React.useCallback(() => {
    const clubId = localStorage.getItem('currentClubId')
    if (!clubId) return

    // 获取今日课程
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    fetch(`/api/courses?clubId=${clubId}&startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        setCourses(data)
        setStats((prev) => ({ ...prev, todayCourses: data.length }))
      })
      .catch(console.error)

    // 获取统计数据
    fetch(`/api/statistics?clubId=${clubId}&period=month`)
      .then((res) => res.json())
      .then((data) => {
        setStats((prev) => ({
          ...prev,
          weekLessons: data.totalLessons,
          activeStudents: data.activeStudents,
          monthIncome: data.monthIncome || 0,
        }))
      })
      .catch(console.error)
  }, [])

  React.useEffect(() => {
    fetchData()

    // 监听俱乐部切换事件
    const handleClubChanged = () => fetchData()
    window.addEventListener('clubChanged', handleClubChanged)
    return () => window.removeEventListener('clubChanged', handleClubChanged)
  }, [fetchData])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">欢迎使用俱乐部课时管理系统</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">今日课程</p>
                <p className="text-2xl font-bold mt-1">{stats.todayCourses}</p>
              </div>
              <Calendar className="h-12 w-12 text-blue-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">本月课时</p>
                <p className="text-2xl font-bold mt-1">{stats.weekLessons}</p>
              </div>
              <Timer className="h-12 w-12 text-green-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">活跃学员</p>
                <p className="text-2xl font-bold mt-1">{stats.activeStudents}</p>
              </div>
              <Users className="h-12 w-12 text-yellow-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">本月收入</p>
                <p className="text-2xl font-bold mt-1">¥{stats.monthIncome.toLocaleString()}</p>
              </div>
              <DollarSign className="h-12 w-12 text-red-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
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

      {/* Today's Courses */}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
