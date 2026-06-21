'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

// 生成一周的日期
function getWeekDates(offset: number = 0) {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  return dates
}

// 时间段 8:00 - 21:00
const hours = Array.from({ length: 14 }, (_, i) => i + 8)

const statusMap: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }> = {
  scheduled: { label: '待开始', variant: 'default' },
  in_progress: { label: '进行中', variant: 'warning' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'destructive' },
}

const courseColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500']

interface CourseData {
  id: number
  subject: string
  coach: string
  campus: string
  date: string
  startTime: string
  endTime: string
  students: string
  status: string
}

interface Subject { id: number; name: string; durationMinutes: number }
interface Coach { id: number; name: string }
interface Campus { id: number; name: string }
interface Student { id: number; name: string }

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = React.useState(0)
  const [courses, setCourses] = React.useState<CourseData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedCourse, setSelectedCourse] = React.useState<CourseData | null>(null)

  // 下拉选项数据
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [coaches, setCoaches] = React.useState<Coach[]>([])
  const [campuses, setCampuses] = React.useState<Campus[]>([])
  const [students, setStudents] = React.useState<Student[]>([])

  // 表单状态
  const [form, setForm] = React.useState({
    subjectId: '',
    coachId: '',
    campusId: '',
    scheduledDate: '',
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    remark: '',
    studentIds: [] as number[],
  })

  const weekDates = getWeekDates(weekOffset)
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const today = new Date()
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()

  // 加载下拉选项
  const loadOptions = React.useCallback(async () => {
    try {
      const [subRes, coachRes, campusRes, studentRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/users?role=coach'),
        fetch('/api/campuses'),
        fetch('/api/students'),
      ])
      const [subData, coachData, campusData, studentData] = await Promise.all([
        subRes.json(), coachRes.json(), campusRes.json(), studentRes.json(),
      ])
      setSubjects(subData)
      setCoaches(coachData)
      setCampuses(campusData)
      setStudents(studentData)
    } catch (e) {
      console.error('加载选项失败:', e)
    }
  }, [])

  // 加载课程数据
  const loadCourses = React.useCallback(async () => {
    setLoading(true)
    try {
      const startDate = weekDates[0].toISOString()
      const endDate = new Date(weekDates[6].getTime() + 86400000 - 1).toISOString()
      const res = await fetch(`/api/courses?startDate=${startDate}&endDate=${endDate}`)
      const data = await res.json()
      setCourses(data)
    } catch (e) {
      console.error('加载课程失败:', e)
    } finally {
      setLoading(false)
    }
  }, [weekDates])

  React.useEffect(() => {
    loadCourses()
  }, [loadCourses])

  React.useEffect(() => {
    loadOptions()
  }, [loadOptions])

  // 创建课程
  const handleCreate = async () => {
    if (!form.subjectId || !form.coachId || !form.scheduledDate) {
      alert('请填写必要信息')
      return
    }
    // 获取第一个俱乐部 ID
    const clubRes = await fetch('/api/clubs')
    const clubs = await clubRes.json()
    const clubId = clubs[0]?.id
    if (!clubId) {
      alert('请先创建俱乐部')
      return
    }

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          campusId: form.campusId || null,
          subjectId: form.subjectId,
          coachId: form.coachId,
          scheduledDate: form.scheduledDate,
          startTime: form.startTime,
          endTime: form.endTime,
          location: form.location,
          remark: form.remark,
          studentIds: form.studentIds,
          createdBy: 1,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || '创建失败')
        return
      }
      setDialogOpen(false)
      resetForm()
      loadCourses()
    } catch (e) {
      alert('创建失败')
    }
  }

  // 删除课程
  const handleDelete = async () => {
    if (!selectedCourse) return
    try {
      await fetch(`/api/courses/${selectedCourse.id}`, { method: 'DELETE' })
      setDeleteDialogOpen(false)
      setSelectedCourse(null)
      loadCourses()
    } catch (e) {
      alert('删除失败')
    }
  }

  const resetForm = () => {
    setForm({
      subjectId: '', coachId: '', campusId: '',
      scheduledDate: '', startTime: '09:00', endTime: '10:00',
      location: '', remark: '', studentIds: [],
    })
  }

  // 将课程映射到日历网格
  const getCourseAt = (dayIdx: number, hour: number) => {
    const dateStr = weekDates[dayIdx].toISOString().split('T')[0]
    return courses.find((c) => {
      if (c.date !== dateStr) return false
      const startHour = parseInt(c.startTime.split(':')[0])
      return startHour === hour
    })
  }

  // 计算课程高度（分钟 → px，1小时=48px）
  const getCourseHeight = (course: CourseData) => {
    const [sh, sm] = course.startTime.split(':').map(Number)
    const [eh, em] = course.endTime.split(':').map(Number)
    const minutes = (eh * 60 + em) - (sh * 60 + sm)
    return Math.max((minutes / 60) * 48, 24)
  }

  // 根据课程 ID 分配颜色
  const getCourseColor = (courseId: number) => {
    return courseColors[courseId % courseColors.length]
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">排课管理</h1>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              新建课程
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedCourse ? '编辑课程' : '新建课程'}</DialogTitle>
              <DialogDescription>填写课程信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">科目 *</label>
                  <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                    <SelectTrigger><SelectValue placeholder="选择科目" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">教练 *</label>
                  <Select value={form.coachId} onValueChange={(v) => setForm({ ...form, coachId: v })}>
                    <SelectTrigger><SelectValue placeholder="选择教练" /></SelectTrigger>
                    <SelectContent>
                      {coaches.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">日期 *</label>
                  <Input
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">校区</label>
                  <Select value={form.campusId} onValueChange={(v) => setForm({ ...form, campusId: v })}>
                    <SelectTrigger><SelectValue placeholder="选择校区" /></SelectTrigger>
                    <SelectContent>
                      {campuses.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">开始时间 *</label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">结束时间 *</label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">上课地点</label>
                <Input
                  placeholder="如：A栋篮球场"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">学员</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {students.map((s) => (
                    <label
                      key={s.id}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer transition-colors ${
                        form.studentIds.includes(s.id)
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.studentIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, studentIds: [...form.studentIds, s.id] })
                          } else {
                            setForm({ ...form, studentIds: form.studentIds.filter((id) => id !== s.id) })
                          }
                        }}
                      />
                      {s.name}
                    </label>
                  ))}
                  {students.length === 0 && <span className="text-sm text-gray-400">暂无学员</span>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">备注</label>
                <Input
                  placeholder="选填"
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreate}>确定</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {weekDates[0].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
            {' - '}
            {weekDates[6].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
          </span>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
              回到本周
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b">
                  <th className="w-16 p-2 text-xs text-gray-500"></th>
                  {weekDates.map((d, i) => (
                    <th key={i} className={`p-2 text-center text-xs ${isToday(d) ? 'text-blue-500 font-bold' : 'text-gray-500'}`}>
                      <div>{dayNames[i]}</div>
                      <div className="text-lg">{d.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => (
                  <tr key={hour} className="border-b last:border-0">
                    <td className="p-2 text-xs text-gray-400 text-right pr-3">{hour}:00</td>
                    {weekDates.map((_, dayIdx) => {
                      const course = getCourseAt(dayIdx, hour)
                      return (
                        <td key={dayIdx} className="p-1 border-l relative">
                          {course && (
                            <div
                              className={`${getCourseColor(course.id)} text-white text-xs p-1.5 rounded cursor-pointer hover:opacity-90 transition-opacity`}
                              style={{ height: `${getCourseHeight(course) - 4}px` }}
                              onClick={() => {
                                setSelectedCourse(course)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <div className="font-medium truncate">{course.subject}</div>
                              <div className="opacity-80 truncate">{course.coach}</div>
                              {course.students && (
                                <div className="opacity-70 truncate text-[10px] mt-0.5">{course.students}</div>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && (
            <div className="text-center py-4 text-sm text-gray-500">加载中...</div>
          )}
          {!loading && courses.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">本周暂无课程安排</div>
          )}
        </CardContent>
      </Card>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>取消课程</DialogTitle>
            <DialogDescription>
              确定要取消 {selectedCourse?.subject}（{selectedCourse?.date} {selectedCourse?.startTime}）吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>返回</Button>
            <Button variant="destructive" onClick={handleDelete}>确认取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
