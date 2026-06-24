'use client'

import * as React from 'react'
import Link from 'next/link'
import { Calendar, Timer, BarChart3, CalendarPlus, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authFetch } from '@/lib/fetch-client'

export default function StudentHomePage() {
  const [stats, setStats] = React.useState<any>(null)
  const [upcomingCourses, setUpcomingCourses] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, coursesRes] = await Promise.all([
          authFetch('/api/student/my-stats?period=month'),
          authFetch('/api/student/my-courses'),
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json()
          // 只显示今天的课程
          const today = new Date().toISOString().split('T')[0]
          const todayCourses = coursesData.filter((c: any) =>
            new Date(c.scheduledDate).toISOString().split('T')[0] === today
          )
          setUpcomingCourses(todayCourses.slice(0, 5))
        }
      } catch (error) {
        console.error('获取数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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
      <h1 className="text-2xl font-bold">我的学习</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">本月课时</p>
                <p className="text-2xl font-bold">{stats?.totalLessons || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Timer className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">本月时长</p>
                <p className="text-2xl font-bold">{stats?.totalMinutes || 0}分钟</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已完成</p>
                <p className="text-2xl font-bold">{stats?.completedLessons || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CalendarPlus className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">待上课</p>
                <p className="text-2xl font-bold">{stats?.pendingLessons || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 今日课程 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">今日课程</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingCourses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">今天没有课程安排</p>
          ) : (
            <div className="space-y-3">
              {upcomingCourses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{course.subject?.name || '未知科目'}</p>
                    <p className="text-sm text-gray-500">
                      {course.startTime} - {course.endTime} | {course.coach?.name || '未知教练'}
                    </p>
                  </div>
                  <span className="text-sm text-blue-600">{course.location || ''}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/student/courses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium">我的课程</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/lessons">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Timer className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">课时记录</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/stats">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="font-medium">学习统计</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/book">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <CalendarPlus className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <p className="font-medium">预约教练</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
