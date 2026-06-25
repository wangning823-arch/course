'use client'

import * as React from 'react'
import { Users, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { authFetch } from '@/lib/fetch-client'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultChildId?: number | null
  defaultDate?: string
  defaultTime?: string
  /** 学员模式：传入后隐藏孩子选择器，直接用 studentId 预约 */
  studentMode?: boolean
  studentId?: number
  studentClubId?: number
}

export function ParentBookDialog({ open, onOpenChange, defaultChildId, defaultDate, defaultTime, studentMode, studentId, studentClubId }: Props) {
  const [children, setChildren] = React.useState<any[]>([])
  const [selectedChild, setSelectedChild] = React.useState<any>(null)
  const [coaches, setCoaches] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedCoach, setSelectedCoach] = React.useState<any>(null)
  const [selectedSubject, setSelectedSubject] = React.useState<any>(null)
  const [selectedDate, setSelectedDate] = React.useState(defaultDate || '')
  const [selectedTime, setSelectedTime] = React.useState(defaultTime || '')
  const [selectedEndTime, setSelectedEndTime] = React.useState('')
  const [remark, setRemark] = React.useState('')
  const [coachConflict, setCoachConflict] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [successOpen, setSuccessOpen] = React.useState(false)

  // 当弹窗打开时加载数据
  React.useEffect(() => {
    if (!open) return
    setSelectedCoach(null)
    setSelectedSubject(null)
    setSelectedDate(defaultDate || '')
    setSelectedTime(defaultTime || '')
    setSelectedEndTime('')
    setRemark('')
    setConfirmOpen(false)
    setSuccessOpen(false)
    setCoachConflict(false)

    // 学员模式：直接设置自己的信息，不需要选孩子
    if (studentMode && studentId && studentClubId) {
      setSelectedChild({ id: studentId, name: '自己', club: { id: studentClubId } })
      setLoading(false)
      return
    }

    const fetchChildren = async () => {
      setLoading(true)
      try {
        const res = await authFetch('/api/parent/children')
        if (res.ok) {
          const data = await res.json()
          setChildren(data.linked || [])
          if (defaultChildId) {
            const child = data.linked?.find((c: any) => c.id === defaultChildId)
            if (child) setSelectedChild(child)
          } else if (data.linked?.length > 0) {
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
  }, [open, defaultChildId, defaultDate, defaultTime, studentMode, studentId, studentClubId])

  // 获取可预约的教练
  React.useEffect(() => {
    if (!selectedChild?.club?.id) return
    const fetchCoaches = async () => {
      try {
        const res = await authFetch(`/api/student/coaches?clubId=${selectedChild.club.id}`)
        if (res.ok) {
          const data = await res.json()
          setCoaches(data)
        }
      } catch (error) {
        console.error('获取教练列表失败:', error)
      }
    }
    fetchCoaches()
  }, [selectedChild?.club?.id])

  // 开始时间变化时，自动设置结束时间（+1小时）
  React.useEffect(() => {
    if (selectedTime) {
      const [h, m] = selectedTime.split(':').map(Number)
      setSelectedEndTime(`${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }, [selectedTime])

  // 检查教练时间冲突
  React.useEffect(() => {
    if (!selectedCoach || !selectedDate || !selectedTime || !selectedEndTime) {
      setCoachConflict(false)
      return
    }
    const checkConflict = async () => {
      try {
        const res = await authFetch(`/api/courses/check-conflict?coachId=${selectedCoach.id}&date=${selectedDate}&startTime=${selectedTime}&endTime=${selectedEndTime}`)
        if (res.ok) {
          const data = await res.json()
          setCoachConflict(data.hasConflict)
        }
      } catch {
        setCoachConflict(false)
      }
    }
    checkConflict()
  }, [selectedCoach?.id, selectedDate, selectedTime, selectedEndTime])

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ]

  const handleSubmit = async () => {
    if (!selectedChild || !selectedCoach || !selectedSubject || !selectedDate || !selectedTime || !selectedEndTime) return
    setSubmitting(true)
    try {
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: selectedChild.club.id,
          coachId: selectedCoach.id,
          subjectId: selectedSubject.id,
          studentId: selectedChild.id,
          date: selectedDate,
          startTime: selectedTime,
          endTime: selectedEndTime,
          remark,
        }),
      })
      if (res.ok) {
        setConfirmOpen(false)
        setSuccessOpen(true)
        // 通知其他页面刷新数据
        window.dispatchEvent(new CustomEvent('bookingChanged'))
        setSelectedCoach(null)
        setSelectedSubject(null)
        setSelectedDate('')
        setSelectedTime('')
        setRemark('')
      } else {
        const data = await res.json()
        alert(data.error || '预约失败')
      }
    } catch {
      alert('预约失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = selectedSubject && selectedDate && selectedTime && selectedEndTime && !coachConflict

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>预约课程</DialogTitle>
            <DialogDescription>{studentMode ? '预约课程' : '为孩子预约课程'}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">加载中...</div>
          ) : (
            <div className="space-y-4 py-2">
              {/* 选择孩子 */}
              {children.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择孩子</label>
                  <div className="flex gap-2 flex-wrap">
                    {children.map((child) => (
                      <Button
                        key={child.id}
                        variant={selectedChild?.id === child.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedChild(child)
                          setSelectedCoach(null)
                          setSelectedSubject(null)
                        }}
                      >
                        <Users className="h-3.5 w-3.5 mr-1" />
                        {child.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* 教练选择 - 下拉框 */}
              {selectedChild && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择教练</label>
                  {coaches.length === 0 ? (
                    <p className="text-sm text-gray-400">暂无可预约的教练</p>
                  ) : (
                    <Select
                      value={selectedCoach?.id?.toString() || ''}
                      onValueChange={(value) => {
                        const coach = coaches.find((c: any) => c.id.toString() === value)
                        setSelectedCoach(coach)
                        setSelectedSubject(null)
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="请选择教练" /></SelectTrigger>
                      <SelectContent>
                        {coaches.map((coach: any) => (
                          <SelectItem key={coach.id} value={coach.id.toString()}>
                            {coach.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* 科目选择 */}
              {selectedCoach && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择科目</label>
                  <Select
                    value={selectedSubject?.id?.toString() || ''}
                    onValueChange={(value) => {
                      const subject = selectedCoach.subjects.find((s: any) => s.id.toString() === value)
                      setSelectedSubject(subject)
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="请选择科目" /></SelectTrigger>
                    <SelectContent>
                      {selectedCoach.subjects?.map((subject: any) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 日期时间 */}
              {selectedCoach && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">日期</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">开始时间</label>
                      <Input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">结束时间</label>
                      <Input
                        type="time"
                        value={selectedEndTime}
                        onChange={(e) => setSelectedEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  {coachConflict && (
                    <p className="text-sm text-red-500">该教练在此时间段已有课程，请选择其他时间</p>
                  )}
                </div>
              )}

              {/* 备注 */}
              {selectedCoach && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">备注（选填）</label>
                  <Input
                    placeholder="请输入备注信息"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button disabled={!canSubmit} onClick={() => setConfirmOpen(true)}>提交预约</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 确认对话框 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认预约</DialogTitle>
            <DialogDescription>请确认以下预约信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">{studentMode ? '学员：' : '孩子：'}</span><span>{studentMode ? '自己' : selectedChild?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">教练：</span><span>{selectedCoach?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">科目：</span><span>{selectedSubject?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">日期：</span><span>{selectedDate}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">时间：</span><span>{selectedTime} - {selectedEndTime}</span></div>
            {remark && <div className="flex justify-between"><span className="text-gray-500">备注：</span><span>{remark}</span></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : '确认预约'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成功对话框 */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              预约成功
            </DialogTitle>
            <DialogDescription>您的预约已提交，等待教练确认。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => { setSuccessOpen(false); onOpenChange(false) }}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
