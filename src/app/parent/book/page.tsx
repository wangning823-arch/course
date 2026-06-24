'use client'

import * as React from 'react'
import { Users, Calendar, Clock, User, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { authFetch } from '@/lib/fetch-client'
import { useUserStore } from '@/stores/user-store'

export default function ParentBookPage() {
  const user = useUserStore((s) => s.user)
  const [children, setChildren] = React.useState<any[]>([])
  const [selectedChild, setSelectedChild] = React.useState<any>(null)
  const [coaches, setCoaches] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedCoach, setSelectedCoach] = React.useState<any>(null)
  const [selectedSubject, setSelectedSubject] = React.useState<any>(null)
  const [selectedDate, setSelectedDate] = React.useState('')
  const [selectedTime, setSelectedTime] = React.useState('')
  const [remark, setRemark] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = React.useState(false)

  // 获取孩子列表
  React.useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await authFetch('/api/parent/children')
        if (res.ok) {
          const data = await res.json()
          setChildren(data.linked || [])
          if (data.linked?.length > 0) {
            setSelectedChild(data.linked[0])
          }
        }
      } catch (error) {
        console.error('获取孩子列表失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChildren()
  }, [])

  // 获取可预约的教练
  React.useEffect(() => {
    const fetchCoaches = async () => {
      if (!selectedChild?.clubId) return
      try {
        const res = await authFetch(`/api/student/coaches?clubId=${selectedChild.clubId}`)
        if (res.ok) {
          const data = await res.json()
          setCoaches(data)
        }
      } catch (error) {
        console.error('获取教练列表失败:', error)
      }
    }

    fetchCoaches()
  }, [selectedChild?.clubId])

  // 可选时间段
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ]

  const handleSubmit = async () => {
    if (!selectedChild || !selectedCoach || !selectedSubject || !selectedDate || !selectedTime) {
      alert('请填写完整预约信息')
      return
    }

    setSubmitting(true)
    try {
      // 计算结束时间（默认1小时后）
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const endTime = `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      const res = await authFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: selectedChild.clubId,
          coachId: selectedCoach.id,
          subjectId: selectedSubject.id,
          studentId: selectedChild.id,
          date: selectedDate,
          startTime: selectedTime,
          endTime,
          remark,
        }),
      })

      if (res.ok) {
        setDialogOpen(false)
        setSuccessDialogOpen(true)
        // 重置表单
        setSelectedCoach(null)
        setSelectedSubject(null)
        setSelectedDate('')
        setSelectedTime('')
        setRemark('')
      } else {
        const data = await res.json()
        alert(data.error || '预约失败')
      }
    } catch (error) {
      console.error('预约失败:', error)
      alert('预约失败，请重试')
    } finally {
      setSubmitting(false)
    }
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
      <h1 className="text-2xl font-bold">预约课程</h1>

      {/* 选择孩子 */}
      {children.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">选择孩子</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {children.map((child) => (
                <Button
                  key={child.id}
                  variant={selectedChild?.id === child.id ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedChild(child)
                    setSelectedCoach(null)
                    setSelectedSubject(null)
                  }}
                >
                  <Users className="h-4 w-4 mr-1" />
                  {child.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 当前孩子信息 */}
      {selectedChild && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">为 {selectedChild.name} 预约</p>
                <p className="text-sm text-gray-500">
                  {selectedChild.club?.name || '未分配俱乐部'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 教练列表 */}
      {selectedChild && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">选择教练</h2>
          {coaches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                暂无可预约的教练
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {coaches.map((coach) => (
                <Card
                  key={coach.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedCoach?.id === coach.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedCoach(coach)
                    setSelectedSubject(null)
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">{coach.name}</h3>
                        <p className="text-sm text-gray-500">
                          {coach.subjects?.length || 0}个科目
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 预约表单 */}
      {selectedCoach && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">预约 {selectedCoach.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">选择科目</label>
              <Select
                value={selectedSubject?.id?.toString() || ''}
                onValueChange={(value) => {
                  const subject = selectedCoach.subjects.find((s: any) => s.id.toString() === value)
                  setSelectedSubject(subject)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择科目" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCoach.subjects?.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name} - ¥{subject.price}/课时
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">选择日期</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">选择时间</label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择时间" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">备注（选填）</label>
              <Input
                placeholder="请输入备注信息"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => setDialogOpen(true)}
              disabled={!selectedSubject || !selectedDate || !selectedTime}
            >
              提交预约
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 确认对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认预约</DialogTitle>
            <DialogDescription>
              请确认以下预约信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex justify-between">
              <span className="text-gray-500">孩子：</span>
              <span>{selectedChild?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">教练：</span>
              <span>{selectedCoach?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">科目：</span>
              <span>{selectedSubject?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">日期：</span>
              <span>{selectedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">时间：</span>
              <span>{selectedTime}</span>
            </div>
            {remark && (
              <div className="flex justify-between">
                <span className="text-gray-500">备注：</span>
                <span>{remark}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : '确认预约'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成功对话框 */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              预约成功
            </DialogTitle>
            <DialogDescription>
              您的预约已提交，等待教练确认。请留意通知消息。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
