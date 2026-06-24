'use client'

import * as React from 'react'
import { Calendar, Clock, MapPin, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { authFetch } from '@/lib/fetch-client'

export default function StudentCoursesPage() {
  const [courses, setCourses] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState<'all' | 'upcoming' | 'past'>('all')

  React.useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await authFetch('/api/student/my-courses')
        if (res.ok) {
          const data = await res.json()
          setCourses(data)
        }
      } catch (error) {
        console.error('获取课程失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  const filteredCourses = React.useMemo(() => {
    const now = new Date()
    return courses.filter((course) => {
      const courseDate = new Date(course.scheduledDate)
      if (filter === 'upcoming') return courseDate >= now
      if (filter === 'past') return courseDate < now
      return true
    })
  }, [courses, filter])

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      scheduled: { label: '待上课', variant: 'default' },
      in_progress: { label: '进行中', variant: 'secondary' },
      completed: { label: '已完成', variant: 'outline' },
      cancelled: { label: '已取消', variant: 'destructive' },
    }
    return statusMap[status] || { label: status, variant: 'outline' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的课程</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1 rounded-md text-sm ${filter === 'upcoming' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            待上课
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-3 py-1 rounded-md text-sm ${filter === 'past' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            已完成
          </button>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            暂无课程记录
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCourses.map((course) => {
            const statusInfo = getStatusBadge(course.status)
            return (
              <Card key={course.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{course.subject?.name || '未知科目'}</h3>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(course.scheduledDate).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{course.startTime} - {course.endTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{course.coach?.name || '未知教练'}</span>
                        </div>
                        {course.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{course.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
