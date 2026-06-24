'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Check, X, Clock, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authFetch } from '@/lib/fetch-client'
import { useUserStore } from '@/stores/user-store'
import { useClubStore } from '@/stores/club-store'

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  pending: { label: '待确认', variant: 'warning' },
  confirmed: { label: '已确认', variant: 'success' },
  cancelled: { label: '已取消', variant: 'secondary' },
  rejected: { label: '已拒绝', variant: 'destructive' },
}

export default function BookingsPage() {
  const user = useUserStore((s) => s.user)
  const currentClubId = useClubStore((s) => s.currentClubId)
  const [bookings, setBookings] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState('pending')

  // 拒绝对话框
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [rejectBooking, setRejectBooking] = React.useState<any>(null)
  const [rejectReason, setRejectReason] = React.useState('')
  const [rejecting, setRejecting] = React.useState(false)

  // 详情对话框
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false)
  const [selectedBooking, setSelectedBooking] = React.useState<any>(null)

  const fetchBookings = React.useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/bookings'
      const params: string[] = []
      if (statusFilter && statusFilter !== 'all') {
        params.push(`status=${statusFilter}`)
      }
      if (user?.role === 'club_admin' && currentClubId && currentClubId !== 'all') {
        params.push(`clubId=${currentClubId}`)
      }
      if (params.length > 0) {
        url += `?${params.join('&')}`
      }
      const res = await authFetch(url)
      const data = await res.json()
      setBookings(data)
    } catch (error) {
      console.error('获取预约列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, user?.role, currentClubId])

  React.useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleConfirm = async (booking: any) => {
    try {
      const res = await authFetch(`/api/bookings/${booking.id}/confirm`, {
        method: 'PUT',
      })
      if (res.ok) {
        fetchBookings()
      } else {
        const data = await res.json()
        alert(data.error || '确认失败')
      }
    } catch (error) {
      console.error('确认预约失败:', error)
    }
  }

  const handleReject = async () => {
    if (!rejectBooking || !rejectReason.trim()) return
    setRejecting(true)
    try {
      const res = await authFetch(`/api/bookings/${rejectBooking.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      if (res.ok) {
        setRejectDialogOpen(false)
        setRejectBooking(null)
        setRejectReason('')
        fetchBookings()
      } else {
        let msg = '拒绝失败'
        try { const data = await res.json(); msg = data.error || msg } catch {}
        alert(msg)
      }
    } catch (error) {
      console.error('拒绝预约失败:', error)
    } finally {
      setRejecting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/schedule" className="hover:text-gray-700">排课管理</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900 font-medium">预约管理</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">预约管理</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待确认</SelectItem>
              <SelectItem value="confirmed">已确认</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无预约记录</div>
          ) : (
            <>
              {/* 桌面端表格 */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>学员</TableHead>
                      <TableHead>科目</TableHead>
                      <TableHead>教练</TableHead>
                      <TableHead>日期</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.student?.name || '-'}</TableCell>
                        <TableCell>{booking.subject?.name || '未指定'}</TableCell>
                        <TableCell>{booking.coach?.name || '-'}</TableCell>
                        <TableCell>{formatDate(booking.date)}</TableCell>
                        <TableCell>{booking.startTime}-{booking.endTime}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[booking.status]?.variant || 'default'}>
                            {statusConfig[booking.status]?.label || booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-gray-500">
                          {booking.remark || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {booking.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleConfirm(booking)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setRejectBooking(booking)
                                    setRejectReason('')
                                    setRejectDialogOpen(true)
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBooking(booking)
                                setDetailDialogOpen(true)
                              }}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 移动端卡片 */}
              <div className="sm:hidden divide-y">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{booking.student?.name || '-'}</span>
                      <Badge variant={statusConfig[booking.status]?.variant || 'default'}>
                        {statusConfig[booking.status]?.label || booking.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>科目：{booking.subject?.name || '未指定'}</p>
                      <p>教练：{booking.coach?.name || '-'}</p>
                      <p>时间：{formatDate(booking.date)} {booking.startTime}-{booking.endTime}</p>
                      {booking.remark && <p>备注：{booking.remark}</p>}
                      {booking.status === 'rejected' && booking.rejectReason && (
                        <p className="text-red-600">拒绝原因：{booking.rejectReason}</p>
                      )}
                    </div>
                    {booking.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleConfirm(booking)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          确认
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setRejectBooking(booking)
                            setRejectReason('')
                            setRejectDialogOpen(true)
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          拒绝
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 拒绝对话框 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝预约</DialogTitle>
            <DialogDescription>
              请填写拒绝原因，学员/家长将收到通知。
            </DialogDescription>
          </DialogHeader>
          {rejectBooking && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-md p-3 text-sm space-y-1">
                <p>学员：{rejectBooking.student?.name}</p>
                <p>科目：{rejectBooking.subject?.name || '未指定'}</p>
                <p>时间：{formatDate(rejectBooking.date)} {rejectBooking.startTime}-{rejectBooking.endTime}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">拒绝原因 <span className="text-red-500">*</span></label>
                <Textarea
                  placeholder="请输入拒绝原因，如：该时间段已有其他安排"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejecting}
            >
              {rejecting ? '提交中...' : '确认拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              预约详情
              {selectedBooking && (
                <Badge variant={statusConfig[selectedBooking.status]?.variant || 'default'}>
                  {statusConfig[selectedBooking.status]?.label || selectedBooking.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">学员</span>
                <span>{selectedBooking.student?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">科目</span>
                <span>{selectedBooking.subject?.name || '未指定'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">教练</span>
                <span>{selectedBooking.coach?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">日期</span>
                <span>{formatDate(selectedBooking.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">时间</span>
                <span>{selectedBooking.startTime}-{selectedBooking.endTime}</span>
              </div>
              {selectedBooking.remark && (
                <div className="flex justify-between">
                  <span className="text-gray-500">备注</span>
                  <span>{selectedBooking.remark}</span>
                </div>
              )}
              {selectedBooking.status === 'rejected' && selectedBooking.rejectReason && (
                <div className="bg-red-50 rounded-md p-3 mt-2">
                  <p className="text-sm font-medium text-red-700 mb-1">拒绝原因</p>
                  <p className="text-sm text-red-600">{selectedBooking.rejectReason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
