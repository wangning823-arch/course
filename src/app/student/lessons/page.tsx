'use client'

import * as React from 'react'
import { Clock, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { authFetch } from '@/lib/fetch-client'

export default function StudentLessonsPage() {
  const [lessons, setLessons] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)

  const fetchLessons = async (pageNum: number) => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/student/my-lessons?page=${pageNum}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setLessons(data.lessons)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error('获取课时记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchLessons(page)
  }, [page])

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      pending: { label: '待确认', variant: 'secondary', icon: AlertCircle },
      confirmed: { label: '已确认', variant: 'default', icon: CheckCircle },
      cancelled: { label: '已取消', variant: 'destructive', icon: AlertCircle },
    }
    return statusMap[status] || { label: status, variant: 'outline', icon: AlertCircle }
  }

  if (loading && lessons.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">课时记录</h1>

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            暂无课时记录
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => {
            const statusInfo = getStatusBadge(lesson.status)
            const StatusIcon = statusInfo.icon
            return (
              <Card key={lesson.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{lesson.course?.subject?.name || '未知科目'}</h3>
                        <Badge variant={statusInfo.variant}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(lesson.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                        {lesson.durationMinutes && (
                          <span>{lesson.durationMinutes}分钟</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        教练：{lesson.coach?.name || '未知教练'}
                      </div>
                    </div>
                  </div>
                  {lesson.content && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <FileText className="h-4 w-4" />
                        <span>课程内容</span>
                      </div>
                      <p className="text-sm">{lesson.content}</p>
                    </div>
                  )}
                  {lesson.performance && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">表现评价：</span>{lesson.performance}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <span className="text-sm text-gray-500">
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
