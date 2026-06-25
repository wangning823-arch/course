'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Trash2, CheckCheck, Bell, MailOpen, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { authFetch } from '@/lib/fetch-client'

interface Notification {
  id: number
  type: string
  title: string
  content?: string
  isRead: boolean
  createdAt: string
}

const typeIcons: Record<string, string> = {
  booking_new: '📅',
  booking_confirmed: '✅',
  booking_cancelled: '❌',
  booking_rejected: '🚫',
}
const defaultIcon = '🔔'

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}天前`
  return d.toLocaleDateString('zh-CN')
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())
  const [filter, setFilter] = React.useState('all') // all / unread / read
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<'selected' | 'read' | null>(null)

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/notifications?all=true')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('获取通知失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const filteredNotifications = React.useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.isRead)
    if (filter === 'read') return notifications.filter(n => n.isRead)
    return notifications
  }, [notifications, filter])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)))
    }
  }

  const handleDelete = async (ids: number[]) => {
    try {
      const res = await authFetch(`/api/notifications?ids=${ids.join(',')}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setNotifications(prev => prev.filter(n => !ids.includes(n.id)))
        setSelectedIds(new Set())
      }
    } catch (error) {
      console.error('删除通知失败:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await authFetch('/api/notifications', { method: 'PUT' })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      }
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  const openDeleteDialog = (target: 'selected' | 'read') => {
    setDeleteTarget(target)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (deleteTarget === 'selected') {
      await handleDelete(Array.from(selectedIds))
    } else if (deleteTarget === 'read') {
      // 删除所有已读通知
      const readIds = notifications.filter(n => n.isRead).map(n => n.id)
      if (readIds.length > 0) {
        await handleDelete(readIds)
      }
    }
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">首页</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900 font-medium">通知管理</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">通知管理</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部 ({notifications.length})</SelectItem>
              <SelectItem value="unread">未读 ({unreadCount})</SelectItem>
              <SelectItem value="read">已读 ({notifications.length - unreadCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 flex-wrap">
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" />
            全部标记已读
          </Button>
        )}
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog('selected')}>
            <Trash2 className="h-4 w-4 mr-1" />
            删除选中 ({selectedIds.size})
          </Button>
        )}
        {notifications.some(n => n.isRead) && (
          <Button variant="outline" size="sm" onClick={() => openDeleteDialog('read')}>
            <Trash2 className="h-4 w-4 mr-1" />
            清除已读
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              暂无通知
            </div>
          ) : (
            <>
              {/* 桌面端表格 */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>内容</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right w-16">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map((notification) => (
                      <TableRow
                        key={notification.id}
                        className={!notification.isRead ? 'bg-blue-50/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(notification.id)}
                            onCheckedChange={() => toggleSelect(notification.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-lg">{typeIcons[notification.type] || defaultIcon}</span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {notification.title}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-gray-500">
                          {notification.content || '-'}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                          {formatTime(notification.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={notification.isRead ? 'secondary' : 'default'}>
                            {notification.isRead ? '已读' : '未读'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete([notification.id])}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 移动端卡片 */}
              <div className="sm:hidden divide-y">
                {/* 移动端全选 */}
                <div className="p-3 flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-gray-500">
                    {selectedIds.size > 0 ? `已选 ${selectedIds.size} 项` : '全选'}
                  </span>
                </div>
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 flex items-start gap-3 ${!notification.isRead ? 'bg-blue-50/50' : ''}`}
                  >
                    <Checkbox
                      checked={selectedIds.has(notification.id)}
                      onCheckedChange={() => toggleSelect(notification.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{typeIcons[notification.type] || defaultIcon}</span>
                        <span className="font-medium text-sm">{notification.title}</span>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      {notification.content && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{notification.content}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatTime(notification.createdAt)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                      onClick={() => handleDelete([notification.id])}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {deleteTarget === 'selected'
                ? `确定要删除选中的 ${selectedIds.size} 条通知吗？此操作不可撤销。`
                : '确定要清除所有已读通知吗？此操作不可撤销。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={confirmDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
