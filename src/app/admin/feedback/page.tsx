'use client'

import * as React from 'react'
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  MessageSquare, RefreshCw, Eye, Reply, Trash2
} from 'lucide-react'
import { authFetch } from '@/lib/fetch-client'

const categoryOptions: Record<string, string> = {
  feature: '功能建议',
  bug: 'Bug报告',
  other: '其他',
}

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
  user: { id: number; name: string; phone: string }
  createdAt: string
}

export default function FeedbackManagementPage() {
  const [feedbacks, setFeedbacks] = React.useState<Feedback[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filterStatus, setFilterStatus] = React.useState<string>('all')
  const [filterCategory, setFilterCategory] = React.useState<string>('all')

  // 详情弹窗
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [currentFeedback, setCurrentFeedback] = React.useState<Feedback | null>(null)

  // 回复弹窗
  const [replyOpen, setReplyOpen] = React.useState(false)
  const [replyContent, setReplyContent] = React.useState('')
  const [replyStatus, setReplyStatus] = React.useState('processing')

  const fetchFeedbacks = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterCategory !== 'all') params.set('category', filterCategory)

      const url = params.toString() ? `/api/feedback?${params}` : '/api/feedback'
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        setFeedbacks(data.data || [])
      }
    } catch (error) {
      console.error('获取反馈列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterCategory])

  React.useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  // 查看详情
  const handleViewDetail = (feedback: Feedback) => {
    setCurrentFeedback(feedback)
    setDetailOpen(true)
  }

  // 打开回复弹窗
  const handleOpenReply = (feedback: Feedback) => {
    setCurrentFeedback(feedback)
    setReplyContent(feedback.reply || '')
    setReplyStatus(feedback.status)
    setReplyOpen(true)
  }

  // 提交回复
  const handleReply = async () => {
    if (!currentFeedback) return

    try {
      const res = await authFetch(`/api/feedback/${currentFeedback.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: replyStatus,
          reply: replyContent,
        }),
      })

      if (res.ok) {
        alert('回复成功')
        setReplyOpen(false)
        fetchFeedbacks()
      } else {
        const data = await res.json()
        alert(data.error || '回复失败')
      }
    } catch (error) {
      alert('网络错误')
    }
  }

  // 删除反馈
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条反馈吗？')) return

    try {
      const res = await authFetch(`/api/feedback/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('删除成功')
        fetchFeedbacks()
      } else {
        const data = await res.json()
        alert(data.error || '删除失败')
      }
    } catch (error) {
      alert('网络错误')
    }
  }

  // 统计数据
  const stats = React.useMemo(() => {
    const pending = feedbacks.filter((f) => f.status === 'pending').length
    const processing = feedbacks.filter((f) => f.status === 'processing').length
    const resolved = feedbacks.filter((f) => f.status === 'resolved').length
    return { pending, processing, resolved, total: feedbacks.length }
  }, [feedbacks])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">反馈管理</h1>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待处理</SelectItem>
              <SelectItem value="processing">处理中</SelectItem>
              <SelectItem value="resolved">已解决</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="feature">功能建议</SelectItem>
              <SelectItem value="bug">Bug报告</SelectItem>
              <SelectItem value="other">其他</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchFeedbacks}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">待处理</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">处理中</div>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">已解决</div>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">总计</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* 反馈列表 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : feedbacks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无反馈数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>提交人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="hidden sm:table-cell">提交时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbacks.map((fb) => (
                  <TableRow key={fb.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {fb.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoryOptions[fb.category] || fb.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>{fb.user?.name || '-'}</div>
                      <div className="text-xs text-gray-500">{fb.user?.phone || ''}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusOptions[fb.status]?.color || ''}>
                        {statusOptions[fb.status]?.label || fb.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                      {new Date(fb.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="查看详情" onClick={() => handleViewDetail(fb)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="回复反馈" onClick={() => handleOpenReply(fb)}>
                          <Reply className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="删除反馈" className="text-red-500" onClick={() => handleDelete(fb.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>反馈详情</DialogTitle>
          </DialogHeader>
          {currentFeedback && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={statusOptions[currentFeedback.status]?.color || ''}>
                  {statusOptions[currentFeedback.status]?.label || currentFeedback.status}
                </Badge>
                <Badge variant="outline">
                  {categoryOptions[currentFeedback.category] || currentFeedback.category}
                </Badge>
              </div>

              <div>
                <h3 className="font-medium text-lg">{currentFeedback.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  提交人：{currentFeedback.user?.name || '-'} ({currentFeedback.user?.phone || ''})
                </p>
                <p className="text-sm text-gray-500">
                  提交时间：{new Date(currentFeedback.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{currentFeedback.content}</p>
              </div>

              {currentFeedback.reply && (
                <div className="bg-green-50 rounded-lg p-4 space-y-2">
                  <div className="text-sm font-medium text-green-700">
                    管理员回复
                    {currentFeedback.repliedBy && (
                      <span className="text-gray-500 ml-2">by {currentFeedback.repliedBy.name}</span>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{currentFeedback.reply}</p>
                  {currentFeedback.repliedAt && (
                    <p className="text-xs text-gray-500">
                      回复时间：{new Date(currentFeedback.repliedAt).toLocaleString('zh-CN')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 回复弹窗 */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>回复反馈</DialogTitle>
            <DialogDescription>
              回复 {currentFeedback?.user?.name || '未知用户'} 的反馈
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="font-medium">{currentFeedback?.title}</div>
              <p className="text-sm text-gray-600 mt-1">{currentFeedback?.content}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">处理状态</label>
              <Select value={replyStatus} onValueChange={setReplyStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="processing">处理中</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">回复内容</label>
              <Textarea
                placeholder="请输入回复内容..."
                rows={4}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>取消</Button>
            <Button onClick={handleReply}>提交回复</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
