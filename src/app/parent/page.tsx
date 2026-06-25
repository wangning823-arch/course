'use client'

import * as React from 'react'
import Link from 'next/link'
import { Users, Calendar, CalendarPlus, BarChart3, Clock, BookOpen, ArrowRight, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { authFetch } from '@/lib/fetch-client'
import { ParentBookDialog } from './book/dialog'

const statusMap: Record<string, { label: string; variant: 'default' | 'success' | 'warning' }> = {
  completed: { label: '已完成', variant: 'success' },
  in_progress: { label: '进行中', variant: 'warning' },
  scheduled: { label: '待开始', variant: 'default' },
}

export default function ParentHomePage() {
  const [children, setChildren] = React.useState<any[]>([])
  const [childrenData, setChildrenData] = React.useState<Record<number, { courses: any[]; stats: any }>>({})
  const [loading, setLoading] = React.useState(true)
  const [bookDialogOpen, setBookDialogOpen] = React.useState(false)
  const [bookChildId, setBookChildId] = React.useState<number | null>(null)
  const [isParentStudent, setIsParentStudent] = React.useState(false)

  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  React.useEffect(() => {
    const fetchAll = async () => {
      try {
        // 获取孩子列表
        const res = await authFetch('/api/parent/children')
        if (!res.ok) return
        const data = await res.json()
        const linked = data.linked || []
        setChildren(linked)

        if (linked.length === 0) {
          setLoading(false)
          return
        }

        // 为每个孩子获取今日课程和本月统计
        const dataMap: Record<number, { courses: any[]; stats: any }> = {}

        await Promise.all(linked.map(async (child: any) => {
          try {
            // 获取今日课程
            const coursesRes = await authFetch(
              `/api/courses?startDate=${dateStr}&endDate=${dateStr}&studentId=${child.id}`
            )
            const courses = coursesRes.ok ? await coursesRes.json() : []

            // 获取本月统计
            const statsRes = await authFetch(
              `/api/student/my-stats?period=month&studentId=${child.id}`
            )
            const stats = statsRes.ok ? await statsRes.json() : {
              totalHours: 0, completedHours: 0, totalCourseCount: 0, completedCourseCount: 0
            }

            dataMap[child.id] = { courses, stats }
          } catch (e) {
            console.error(`获取孩子 ${child.id} 数据失败:`, e)
            dataMap[child.id] = { courses: [], stats: { totalHours: 0, completedHours: 0, totalCourseCount: 0, completedCourseCount: 0 } }
          }
        }))

        setChildrenData(dataMap)
      } catch (error) {
        console.error('获取数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [dateStr])

  // 检测家长是否同时也是学员
  React.useEffect(() => {
    authFetch('/api/user/roles')
      .then((res) => res.json())
      .then((data) => {
        if (data.isStudent) {
          setIsParentStudent(true)
        }
      })
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <span className="text-gray-900 font-medium">首页</span>
      </div>

      {/* 我的课程 - 家长同时也是学员时显示 */}
      {isParentStudent && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">我的课程</p>
                  <p className="text-sm text-gray-500">查看和预约您自己的课程</p>
                </div>
              </div>
              <Link href="/parent/my-courses">
                <Button variant="outline" size="sm">
                  查看 <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-3">暂无关联的孩子</p>
            <Link href="/parent/children">
              <Button>去关联孩子</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        children.map((child) => {
          const childData = childrenData[child.id] || { courses: [], stats: { totalLessons: 0, totalMinutes: 0, completedLessons: 0, pendingLessons: 0 } }
          return (
            <Card key={child.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{child.name}</CardTitle>
                      <p className="text-sm text-gray-500">
                        {child.club?.name || '未分配俱乐部'}
                        {child.coach?.name ? ` · 教练：${child.coach.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <Link href={`/parent/courses?childId=${child.id}`}>
                    <Button variant="ghost" size="sm">
                      查看全部 <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 统计卡片 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-gray-500">今日课程</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{childData.courses.length}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-gray-500">本月课时</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{childData.stats.totalHours || 0}h</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs text-gray-500">已完成</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{childData.stats.completedHours || 0}h</p>
                  </div>
                </div>

                {/* 今日课程列表 */}
                {childData.courses.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">今日课程</p>
                    <div className="space-y-2">
                      {childData.courses.map((course: any) => (
                        <div key={course.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{course.startTime}-{course.endTime}</span>
                            <span className="text-gray-600">{course.subject}</span>
                            <span className="text-gray-500 hidden sm:inline">{course.coach}</span>
                          </div>
                          <Badge variant={statusMap[course.status]?.variant || 'default'}>
                            {statusMap[course.status]?.label || course.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 快捷操作 */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href="/parent/courses">
                    <Button variant="outline" size="sm">
                      <Calendar className="h-3.5 w-3.5 mr-1" />课程查看
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => { setBookChildId(child.id); setBookDialogOpen(true) }}>
                    <CalendarPlus className="h-3.5 w-3.5 mr-1" />预约课程
                  </Button>
                  <Link href="/student/stats">
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-3.5 w-3.5 mr-1" />学习统计
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
      <ParentBookDialog open={bookDialogOpen} onOpenChange={setBookDialogOpen} defaultChildId={bookChildId} />
    </div>
  )
}
