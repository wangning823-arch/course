'use client'

import * as React from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { showSuccess, showError } from '@/lib/toast'
import { authFetch } from '@/lib/fetch-client'

const categoryOptions = [
  { value: 'feature', label: '功能建议' },
  { value: 'bug', label: 'Bug报告' },
  { value: 'other', label: '其他' },
]

const statusOptions: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-800' },
  resolved: { label: '已解决', color: 'bg-green-100 text-green-800' },
}

interface Feedback {
  id: number
  category: string
  title: string
  content: string
  status: string
  reply: string | null
  repliedAt: string | null
  repliedBy: { id: number; name: string } | null
  createdAt: string
}

export default function FeedbackPage() {
  const [formData, setFormData] = React.useState({
    category: 'feature',
    title: '',
    content: '',
  })
  const [loading, setLoading] = React.useState(false)
  const [feedbacks, setFeedbacks] = React.useState<Feedback[]>([])
  const [fetchLoading, setFetchLoading] = React.useState(true)

  // 获取我的反馈列表
  const fetchFeedbacks = React.useCallback(async () => {
    setFetchLoading(true)
    try {
      const res = await authFetch('/api/feedback')
      if (res.ok) {
        const data = await res.json()
        setFeedbacks(data.data || [])
      }
    } catch (error) {
      console.error('获取反馈列表失败:', error)
    } finally {
      setFetchLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  // 提交反馈
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      showError('请填写标题')
      return
    }
    if (!formData.content.trim()) {
      showError('请填写详细描述')
      return
    }

    setLoading(true)
    try {
      const res = await authFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        showSuccess('反馈提交成功')
        setFormData({ category: 'feature', title: '', content: '' })
        fetchFeedbacks()
      } else {
        const data = await res.json()
        showError(data.error || '提交失败')
      }
    } catch (error) {
      showError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 提交反馈表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            提交反馈
          </CardTitle>
          <CardDescription>
            您的意见和建议对我们非常重要
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">反馈类型</label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">标题</label>
              <Input
                placeholder="请简要描述您的反馈"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">详细描述</label>
              <Textarea
                placeholder="请详细描述您的问题或建议..."
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            <Button type="submit" disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? '提交中...' : '提交反馈'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 我的反馈列表 */}
      <Card>
        <CardHeader>
          <CardTitle>我的反馈</CardTitle>
        </CardHeader>
        <CardContent>
          {fetchLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无反馈记录
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{fb.title}</h3>
                        <Badge className={statusOptions[fb.status]?.color || ''}>
                          {statusOptions[fb.status]?.label || fb.status}
                        </Badge>
                        <Badge variant="outline">
                          {categoryOptions.find((c) => c.value === fb.category)?.label || fb.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{fb.content}</p>
                      <p className="text-xs text-gray-400">
                        提交时间：{new Date(fb.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>

                  {/* 管理员回复 */}
                  {fb.reply && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        管理员回复
                        {fb.repliedBy && (
                          <span className="text-gray-500">by {fb.repliedBy.name}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{fb.reply}</p>
                      {fb.repliedAt && (
                        <p className="text-xs text-gray-400">
                          回复时间：{new Date(fb.repliedAt).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                  )}

                  {!fb.reply && fb.status === 'pending' && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      等待处理中...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
