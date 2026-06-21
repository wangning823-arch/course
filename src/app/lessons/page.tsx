'use client'

import * as React from 'react'
import { Search, Plus, Edit, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClubSelector } from '@/components/club-selector'

const statusMap: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }> = {
  pending: { label: '待确认', variant: 'warning' },
  confirmed: { label: '已确认', variant: 'success' },
  cancelled: { label: '已取消', variant: 'destructive' },
}

interface LessonData {
  id: number
  date: string
  subject: string
  coach: string
  student: string
  campus: string
  duration: number
  content: string
  performance: string
  status: string
  courseId: number
}

interface CourseOption {
  id: number
  subject: string
  coach: string
  date: string
  startTime: string
  students: string
}

interface Student { id: number; name: string }
interface Coach { id: number; name: string }

export default function LessonsPage() {
  const [lessons, setLessons] = React.useState<LessonData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedLesson, setSelectedLesson] = React.useState<LessonData | null>(null)

  // 下拉选项
  const [courses, setCourses] = React.useState<CourseOption[]>([])
  const [students, setStudents] = React.useState<Student[]>([])
  const [coaches, setCoaches] = React.useState<Coach[]>([])

  // 创建表单
  const [form, setForm] = React.useState({
    courseId: '',
    studentId: '',
    coachId: '',
    actualStart: '',
    actualEnd: '',
    durationMinutes: '60',
    content: '',
    performance: '',
    homework: '',
  })

  // 编辑表单
  const [editForm, setEditForm] = React.useState({
    content: '',
    performance: '',
    homework: '',
    status: '',
  })

  // 加载下拉选项
  const loadOptions = React.useCallback(async () => {
    const clubId = localStorage.getItem('currentClubId')
    if (!clubId) return
    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : null
    try {
      const studentUrl = user?.role === 'coach' && user?.id
        ? `/api/students?clubId=${clubId}&coachId=${user.id}`
        : `/api/students?clubId=${clubId}`
      const [courseRes, studentRes, coachRes] = await Promise.all([
        fetch(`/api/courses?clubId=${clubId}${user?.role === 'coach' && user?.id ? `&coachId=${user.id}` : ''}`),
        fetch(studentUrl),
        fetch(`/api/users?role=coach&clubId=${clubId}`),
      ])
      const [courseData, studentData, coachData] = await Promise.all([
        courseRes.json(), studentRes.json(), coachRes.json(),
      ])
      setCourses(courseData)
      setStudents(studentData)
      // 教练只能选自己
      if (user?.role === 'coach' && user?.id) {
        setCoaches(coachData.filter((c: Coach) => c.id === user.id))
      } else {
        setCoaches(coachData)
      }
    } catch (e) {
      console.error('加载选项失败:', e)
    }
  }, [])

  // 加载课时记录
  const loadLessons = React.useCallback(async () => {
    const clubId = localStorage.getItem('currentClubId')
    if (!clubId) return

    // 获取当前用户信息
    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : null

    setLoading(true)
    try {
      let params = `clubId=${clubId}`

      // 教练只能看自己的课时
      if (user?.role === 'coach' && user?.id) {
        params += `&coachId=${user.id}`
      }

      if (search) params += `&search=${encodeURIComponent(search)}`
      const res = await fetch(`/api/lessons?${params}`)
      const data = await res.json()
      setLessons(data)
    } catch (e) {
      console.error('加载课时记录失败:', e)
    } finally {
      setLoading(false)
    }
  }, [search])

  React.useEffect(() => {
    loadLessons()
  }, [loadLessons])

  React.useEffect(() => {
    loadOptions()
  }, [loadOptions])

  // 教练角色自动选中自己
  React.useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      if (user.role === 'coach' && user.id) {
        setForm((prev) => ({ ...prev, coachId: String(user.id) }))
      }
    }
  }, [])

  // 监听俱乐部切换
  React.useEffect(() => {
    const handleClubChanged = () => {
      loadLessons()
      loadOptions()
    }
    window.addEventListener('clubChanged', handleClubChanged)
    return () => window.removeEventListener('clubChanged', handleClubChanged)
  }, [loadLessons, loadOptions])

  // 创建课时记录
  const handleCreate = async () => {
    if (!form.courseId || !form.studentId || !form.coachId) {
      alert('请选择课程、学员和教练')
      return
    }
    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: form.courseId,
          studentId: form.studentId,
          coachId: form.coachId,
          actualStart: form.actualStart || null,
          actualEnd: form.actualEnd || null,
          durationMinutes: form.durationMinutes,
          content: form.content,
          performance: form.performance,
          homework: form.homework,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || '创建失败')
        return
      }
      setDialogOpen(false)
      resetForm()
      loadLessons()
    } catch (e) {
      alert('创建失败')
    }
  }

  // 编辑课时记录
  const handleEdit = async () => {
    if (!selectedLesson) return
    try {
      const res = await fetch(`/api/lessons/${selectedLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        alert('更新失败')
        return
      }
      setEditDialogOpen(false)
      setSelectedLesson(null)
      loadLessons()
    } catch (e) {
      alert('更新失败')
    }
  }

  // 确认课时
  const handleConfirm = async (lesson: LessonData) => {
    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : null
    try {
      await fetch(`/api/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', confirmedById: user?.id || 1 }),
      })
      loadLessons()
    } catch (e) {
      alert('确认失败')
    }
  }

  // 删除课时记录
  const handleDelete = async () => {
    if (!selectedLesson) return
    try {
      await fetch(`/api/lessons/${selectedLesson.id}`, { method: 'DELETE' })
      setDeleteDialogOpen(false)
      setSelectedLesson(null)
      loadLessons()
    } catch (e) {
      alert('删除失败')
    }
  }

  const resetForm = () => {
    setForm({
      courseId: '', studentId: '', coachId: '',
      actualStart: '', actualEnd: '', durationMinutes: '60',
      content: '', performance: '', homework: '',
    })
  }

  const openEditDialog = (lesson: LessonData) => {
    setSelectedLesson(lesson)
    setEditForm({
      content: lesson.content || '',
      performance: lesson.performance || '',
      homework: '',
      status: lesson.status,
    })
    setEditDialogOpen(true)
  }

  const filtered = lessons.filter(
    (l) =>
      l.subject?.includes(search) ||
      l.coach?.includes(search) ||
      l.student?.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">课时记录</h1>
        <div className="flex items-center gap-3">
          <ClubSelector />
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              记录课时
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>记录课时</DialogTitle>
              <DialogDescription>填写课时实际信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">选择课程 *</label>
                <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择已有课程" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.subject} - {c.coach} - {c.date} {c.startTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">学员 *</label>
                  <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                    <SelectTrigger><SelectValue placeholder="选择学员" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">实际开始时间</label>
                  <Input
                    type="time"
                    value={form.actualStart}
                    onChange={(e) => setForm({ ...form, actualStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">实际结束时间</label>
                  <Input
                    type="time"
                    value={form.actualEnd}
                    onChange={(e) => setForm({ ...form, actualEnd: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">时长(分钟)</label>
                  <Input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">教学内容</label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[80px]"
                  placeholder="请输入教学内容"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">学员表现</label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
                  placeholder="请输入学员表现评价"
                  value={form.performance}
                  onChange={(e) => setForm({ ...form, performance: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreate}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索科目、教练、学员..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>科目</TableHead>
                <TableHead>教练</TableHead>
                <TableHead className="hidden sm:table-cell">学员</TableHead>
                <TableHead className="hidden md:table-cell">校区</TableHead>
                <TableHead>时长</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">加载中...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">暂无课时记录</TableCell>
                </TableRow>
              ) : (
                filtered.map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell>{lesson.date}</TableCell>
                    <TableCell>{lesson.subject}</TableCell>
                    <TableCell>{lesson.coach}</TableCell>
                    <TableCell className="hidden sm:table-cell">{lesson.student}</TableCell>
                    <TableCell className="hidden md:table-cell">{lesson.campus}</TableCell>
                    <TableCell>{lesson.duration}分钟</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[lesson.status]?.variant || 'default'}>
                        {statusMap[lesson.status]?.label || lesson.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {lesson.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => handleConfirm(lesson)} title="确认">
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(lesson)} title="编辑">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedLesson(lesson); setDeleteDialogOpen(true) }} title="删除">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 编辑弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑课时记录</DialogTitle>
            <DialogDescription>{selectedLesson?.subject} - {selectedLesson?.student}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">状态</label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待确认</SelectItem>
                  <SelectItem value="confirmed">已确认</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">教学内容</label>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[80px]"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">学员表现</label>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
                value={editForm.performance}
                onChange={(e) => setEditForm({ ...editForm, performance: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除课时记录</DialogTitle>
            <DialogDescription>
              确定要删除 {selectedLesson?.subject}（{selectedLesson?.student}）的课时记录吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
