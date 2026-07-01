'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Plus, Edit, Trash2, Check, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClubSelector } from '@/components/club-selector'
import { authFetch } from '@/lib/fetch-client'
import { useDebounce } from '@/hooks/use-debounce'
import { useUserStore } from '@/stores/user-store'
import { exportLessons } from '@/lib/export-utils'
import { useClubStore } from '@/stores/club-store'
import { Lesson, Course, Student, Coach, Subject, Club, LessonStatus } from '@/types/api'

const statusMap: Record<LessonStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }> = {
  pending: { label: '待确认', variant: 'warning' },
  confirmed: { label: '已确认', variant: 'success' },
  cancelled: { label: '已取消', variant: 'destructive' },
}

type LessonData = Lesson
type CourseOption = Course & { students: string; studentIds: number[] }

export default function LessonsPage() {
  const searchParams = useSearchParams()
  const courseIdFromUrl = searchParams.get('courseId')
  const user = useUserStore((s) => s.user)
  const currentClubId = useClubStore((s) => s.currentClubId)
  const [lessons, setLessons] = React.useState<LessonData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedLesson, setSelectedLesson] = React.useState<LessonData | null>(null)
  const [timeRange, setTimeRange] = React.useState('month')
  const [isCustomRange, setIsCustomRange] = React.useState(false)
  const [customStartDate, setCustomStartDate] = React.useState('')
  const [customEndDate, setCustomEndDate] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 20

  // 下拉选项
  const [courses, setCourses] = React.useState<CourseOption[]>([])
  const [students, setStudents] = React.useState<Student[]>([])
  const [coaches, setCoaches] = React.useState<Coach[]>([])
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [clubs, setClubs] = React.useState<Club[]>([])

  const role = user?.role || ''
  const userId = user?.id || null

  // 格式化日期为 YYYY-MM-DD
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 处理时间段选择
  const handleTimeRangeChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomRange(true)
      // 设置默认的自定义范围（上个月）
      const now = new Date()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      setCustomStartDate(formatDate(lastMonthStart))
      setCustomEndDate(formatDate(lastMonthEnd))
      setTimeRange('custom')
    } else {
      setIsCustomRange(false)
      setTimeRange(value)
    }
  }

  // 创建表单
  const [form, setForm] = React.useState({
    courseId: '',
    clubId: '',
    subjectId: '',
    scheduledDate: '',
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
    if (!currentClubId) return
    try {
      const isPartTimeCoach = (role === 'coach' || role === 'part_time_coach') && userId
      const clubFilter = isPartTimeCoach && currentClubId && currentClubId !== 'all' ? `&clubId=${currentClubId}` : ''
      const fetchPromises = [
        // 兼职教练：只看自己的课程，选择具体俱乐部时按俱乐部过滤；管理员/全职教练：按俱乐部过滤
        authFetch(isPartTimeCoach
          ? `/api/courses?coachId=${userId}${clubFilter}`
          : `/api/courses?clubId=${currentClubId}`),
        // 兼职教练：只看自己的学员，选择具体俱乐部时按俱乐部过滤；管理员/全职教练：按俱乐部过滤
        authFetch(isPartTimeCoach
          ? `/api/students?coachId=${userId}${clubFilter || '&clubId=all'}`
          : `/api/students?clubId=${currentClubId}`),
        authFetch(`/api/users?role=coach,part_time_coach,full_time_coach&clubId=${currentClubId}`),
        // 兼职教练：加载所属俱乐部的科目+私人科目，选择具体俱乐部时按俱乐部过滤；管理员/全职教练：按俱乐部过滤
        authFetch(isPartTimeCoach
          ? `/api/subjects?coachId=${userId}${clubFilter}`
          : `/api/subjects?clubId=${currentClubId}`),
        // 加载俱乐部列表（供表单选择）
        isPartTimeCoach ? authFetch('/api/auth/me/clubs') : authFetch('/api/clubs'),
      ]
      if (role === 'club_admin' || role === 'full_time_coach') {
        fetchPromises.push(authFetch(`/api/users?role=club_admin&clubId=${currentClubId}`))
      }
      const [courseRes, studentRes, coachRes, subjectRes, clubRes, adminRes] = await Promise.all(fetchPromises)
      const safeJson = async (res: Response) => {
        if (!res.ok) return []
        try { return await res.json() } catch { return [] }
      }
      const [courseData, studentData, coachData, subjectData, clubData] = await Promise.all([
        safeJson(courseRes), safeJson(studentRes), safeJson(coachRes), safeJson(subjectRes), safeJson(clubRes),
      ])
      const adminData = adminRes ? await safeJson(adminRes) : []

      // 过滤掉过去的课程，并合并相同课程
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const futureCourses = courseData.filter((c: CourseOption) => c.scheduledDate >= todayStr && c.status !== 'completed')

      // 按科目+教练+日期+时间+学员去重
      const courseMap = new Map<string, CourseOption>()
      for (const c of futureCourses) {
        const sortedStudentIds = [...c.studentIds].sort((a, b) => a - b).join(',')
        const key = `${c.subjectId}-${c.coachId}-${c.scheduledDate}-${c.startTime}-${c.endTime}-${sortedStudentIds}`
        if (!courseMap.has(key)) {
          courseMap.set(key, c)
        }
      }
      setCourses(Array.from(courseMap.values()))
      setStudents(studentData)
      setSubjects(subjectData)
      setClubs(clubData)
      // 兼职教练只能选自己；俱乐部管理员/全职教练可以选所有教练+管理员
      if (isPartTimeCoach && user) {
        // 确保当前教练在列表中（即使不属于当前俱乐部）
        const selfCoach = coachData.find((c: Coach) => c.id === user.id)
        if (selfCoach) {
          setCoaches([selfCoach])
        } else {
          // 教练不在当前俱乐部列表中，添加自己
          setCoaches([{ id: user.id, name: user.name || '当前教练' }])
        }
      } else {
        // 合并教练和管理员列表（去重）
        const coachMap = new Map<number, Coach>()
        for (const c of coachData) coachMap.set(c.id, c)
        for (const a of adminData) coachMap.set(a.id, { id: a.id, name: a.name })
        setCoaches(Array.from(coachMap.values()))
      }
    } catch (e) {
      console.error('加载选项失败:', e)
    }
  }, [])

  // 根据俱乐部加载科目
  const loadSubjectsByClub = React.useCallback(async (selectedClubId: string) => {
    try {
      let url: string
      if (selectedClubId === 'private') {
        // 私人科目：只加载该教练的私人科目
        url = `/api/subjects?coachId=${userId}&clubId=private`
      } else if (selectedClubId) {
        // 选择了具体俱乐部：加载该俱乐部的科目
        url = `/api/subjects?clubId=${selectedClubId}`
      } else if ((role === 'coach' || role === 'part_time_coach') && userId) {
        // 教练未选俱乐部：加载所有所属俱乐部的科目+私人科目
        url = `/api/subjects?coachId=${userId}`
      } else {
        // 管理员/全职教练未选俱乐部：不加载
        setSubjects([])
        return
      }
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        setSubjects(data)
      }
    } catch (e) {
      console.error('加载科目失败:', e)
    }
  }, [])

  // 根据俱乐部加载学员
  const loadStudentsByClub = React.useCallback(async (selectedClubId: string) => {
    try {
      let url: string
      if (selectedClubId === 'private') {
        // 私人课程：只显示教练的纯私有学员
        url = `/api/students?coachId=${userId}&clubId=private`
      } else if ((role === 'coach' || role === 'part_time_coach') && userId) {
        // 教练：按俱乐部过滤学员
        url = `/api/students?coachId=${userId}&clubId=${selectedClubId || 'all'}`
      } else {
        // 管理员/全职教练：按俱乐部过滤
        url = `/api/students?clubId=${selectedClubId}`
      }
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      }
    } catch (e) {
      console.error('加载学员失败:', e)
    }
  }, [role, userId])

  // 加载课时记录
  const loadLessons = React.useCallback(async () => {
    setLoading(true)
    try {
      let params: string
      // 如果有 courseId 参数，直接按课程过滤
      if (courseIdFromUrl) {
        params = `courseId=${courseIdFromUrl}`
      } else if ((role === 'coach' || role === 'part_time_coach') && userId) {
        // 教练：只看自己的课时，选择具体俱乐部时按俱乐部过滤
        params = `coachId=${userId}`
        if (currentClubId && currentClubId !== 'all') {
          params += `&clubId=${currentClubId}`
        }
      } else {
        if (!currentClubId) { setLoading(false); return }
        params = `clubId=${currentClubId === 'all' ? '' : currentClubId}`
      }

      // 添加时间范围参数（按课程过滤时不添加时间范围，显示所有）
      if (!courseIdFromUrl) {
        if (isCustomRange && customStartDate && customEndDate) {
          params += `&startDate=${customStartDate}&endDate=${customEndDate}`
        } else if (timeRange !== 'all') {
          params += `&timeRange=${timeRange}`
        }
      }

      if (debouncedSearch) params += `&search=${encodeURIComponent(debouncedSearch)}`
      const res = await authFetch(`/api/lessons?${params}`)
      const data = await res.json()
      setLessons(data)
      setCurrentPage(1) // 重新加载时重置到第一页
    } catch (e) {
      console.error('加载课时记录失败:', e)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, timeRange, courseIdFromUrl, isCustomRange, customStartDate, customEndDate])

  React.useEffect(() => {
    loadLessons()
  }, [loadLessons])

  React.useEffect(() => {
    loadOptions()
  }, [loadOptions])

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
    // 选择课程时，只需学员和教练；不选课程时，需要俱乐部、科目、日期、学员和教练
    if (form.courseId) {
      if (!form.studentId || !form.coachId) {
        alert('请选择学员和教练')
        return
      }
    } else {
      if (!form.clubId || !form.subjectId || !form.scheduledDate || !form.studentId || !form.coachId) {
        alert('请选择俱乐部、科目、日期、学员和教练')
        return
      }
    }
    try {
      const res = await authFetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: form.courseId || null,
          clubId: form.clubId === 'private' ? null : (form.clubId || null),
          subjectId: form.subjectId || null,
          scheduledDate: form.scheduledDate || null,
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
      const res = await authFetch(`/api/lessons/${selectedLesson.id}`, {
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
    try {
      await authFetch(`/api/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', confirmedById: userId || 1 }),
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
      await authFetch(`/api/lessons/${selectedLesson.id}`, { method: 'DELETE' })
      setDeleteDialogOpen(false)
      setSelectedLesson(null)
      loadLessons()
    } catch (e) {
      alert('删除失败')
    }
  }

  const resetForm = () => {
    // 兼职教练角色保留自己的选中
    const defaultCoachId = (role === 'coach' || role === 'part_time_coach') && userId ? String(userId) : ''

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    setForm({
      courseId: '', clubId: '', subjectId: '', scheduledDate: todayStr,
      studentId: '', coachId: defaultCoachId,
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
      l.subject?.includes(debouncedSearch) ||
      l.coach?.includes(debouncedSearch) ||
      l.student?.includes(debouncedSearch)
  )

  // 先按状态排序（未确认在前），再按日期时间逆序
  const sortedLessons = [...filtered].sort((a, b) => {
    // 状态优先级：pending < confirmed < cancelled
    const statusOrder: Record<string, number> = { pending: 0, confirmed: 1, cancelled: 2 }
    const statusDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1)
    if (statusDiff !== 0) return statusDiff
    // 同状态按日期逆序
    if (a.date !== b.date) return a.date > b.date ? -1 : 1
    return 0
  })

  // 分页
  const totalPages = Math.ceil(sortedLessons.length / pageSize)
  const paginatedLessons = sortedLessons.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // 计算总时长
  const totalMinutes = sortedLessons.reduce((sum, l) => sum + (l.duration || 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainMinutes = totalMinutes % 60
  const totalTimeDisplay = totalHours > 0
    ? (remainMinutes > 0 ? `${totalHours}小时${remainMinutes}分钟` : `${totalHours}小时`)
    : `${totalMinutes}分钟`

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">课时记录</h1>
        <div className="flex items-center gap-3">
          {sortedLessons.length > 0 && (
            <Button
              variant="outline"
              onClick={() => exportLessons(sortedLessons)}
            >
              <Download className="h-4 w-4 mr-1" />
              导出
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              const today = new Date()
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
              setForm(prev => ({ ...prev, scheduledDate: todayStr }))
            }}>
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
                <label className="text-sm font-medium">选择课程（可选）</label>
                <Select value={form.courseId} onValueChange={(v) => {
                  if (!v) {
                    // 取消选择课程，日期默认当天
                    const today = new Date()
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
                    setForm({ ...form, courseId: '', clubId: '', subjectId: '', scheduledDate: todayStr, studentId: '' })
                    // 重新加载科目和学员（恢复为全部）
                    if ((role === 'coach' || role === 'part_time_coach') && userId) {
                      loadSubjectsByClub('')
                      loadStudentsByClub('')
                    }
                    return
                  }
                  // 选中课程时，自动填充所有字段
                  const course = courses.find(c => c.id === parseInt(v))
                  if (course) {
                    // 查找课程所属俱乐部（通过科目关联）
                    const courseSubject = subjects.find(s => s.id === course.subjectId)
                    setForm({
                      ...form,
                      courseId: v,
                      clubId: courseSubject?.clubId ? String(courseSubject.clubId) : '',
                      subjectId: String(course.subjectId),
                      scheduledDate: course.scheduledDate,
                      coachId: String(course.coachId),
                      // 一对一课程自动选中学员；多人课程清空让教练手动选择
                      studentId: course.studentIds.length === 1 ? String(course.studentIds[0]) : '',
                      actualStart: course.startTime,
                      actualEnd: course.endTime,
                    })
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="不选课程可直接记录课时" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.subject} - {c.coach} - {c.scheduledDate} {c.startTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.courseId ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">俱乐部</label>
                  <Input
                    value={clubs.find(c => String(c.id) === form.clubId)?.name || '私人课程'}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">俱乐部 *</label>
                    <Select value={form.clubId} onValueChange={(v) => {
                      setForm({ ...form, clubId: v, subjectId: '', studentId: '' })
                      loadSubjectsByClub(v)
                      loadStudentsByClub(v)
                    }}>
                      <SelectTrigger><SelectValue placeholder="选择俱乐部" /></SelectTrigger>
                      <SelectContent>
                        {clubs.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                        <SelectItem value="private">私人课程（不归属俱乐部）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">科目 *</label>
                      <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                        <SelectTrigger><SelectValue placeholder={form.clubId ? "选择科目" : "请先选择俱乐部"} /></SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">日期 *</label>
                      <Input
                        type="date"
                        value={form.scheduledDate}
                        onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">学员 *</label>
                  <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                    <SelectTrigger><SelectValue placeholder={form.courseId ? "选择课程学员" : "选择学员"} /></SelectTrigger>
                    <SelectContent>
                      {form.courseId ? (
                        // 选择了课程：只显示该课程的学员
                        (() => {
                          const course = courses.find(c => c.id === parseInt(form.courseId))
                          if (!course) return students.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))
                          return course.studentIds.map((sid) => {
                            const student = students.find(s => s.id === sid)
                            return student ? (
                              <SelectItem key={student.id} value={String(student.id)}>{student.name}</SelectItem>
                            ) : null
                          })
                        })()
                      ) : (
                        // 未选课程：显示所有学员
                        students.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))
                      )}
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
                    onFocus={(e) => {
                      // 浏览器自动填入当前时间，把分钟重置为00
                      const val = e.target.value
                      const now = new Date()
                      const h = val ? val.split(':')[0] : String(now.getHours()).padStart(2, '0')
                      e.target.value = `${h}:00`
                      setForm({ ...form, actualStart: `${h}:00` })
                    }}
                    onChange={(e) => {
                      const start = e.target.value
                      const end = form.actualEnd
                      let duration = form.durationMinutes
                      if (start && end) {
                        const [sh, sm] = start.split(':').map(Number)
                        const [eh, em] = end.split(':').map(Number)
                        const mins = (eh * 60 + em) - (sh * 60 + sm)
                        if (mins > 0) duration = String(mins)
                      }
                      setForm({ ...form, actualStart: start, durationMinutes: duration })
                    }}
                    className="w-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">实际结束时间</label>
                  <Input
                    type="time"
                    value={form.actualEnd}
                    onFocus={(e) => {
                      // 浏览器自动填入当前时间，把分钟重置为00
                      const now = new Date()
                      const h = String(now.getHours()).padStart(2, '0')
                      e.target.value = `${h}:00`
                      setForm({ ...form, actualEnd: `${h}:00` })
                    }}
                    onChange={(e) => {
                      const end = e.target.value
                      const start = form.actualStart
                      let duration = form.durationMinutes
                      if (start && end) {
                        const [sh, sm] = start.split(':').map(Number)
                        const [eh, em] = end.split(':').map(Number)
                        const mins = (eh * 60 + em) - (sh * 60 + sm)
                        if (mins > 0) duration = String(mins)
                      }
                      setForm({ ...form, actualEnd: end, durationMinutes: duration })
                    }}
                    className="w-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">时长(分钟)</label>
                  <Input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    className="w-full max-w-[100px]"
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
          <div className="flex flex-wrap items-center gap-2">
            <ClubSelector />
            <Select value={isCustomRange ? 'custom' : timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-[100px] flex-shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部时间</SelectItem>
                <SelectItem value="today">今天</SelectItem>
                <SelectItem value="week">本周</SelectItem>
                <SelectItem value="lastWeek">上周</SelectItem>
                <SelectItem value="month">本月</SelectItem>
                <SelectItem value="lastMonth">上月</SelectItem>
                <SelectItem value="quarter">本季度</SelectItem>
                <SelectItem value="lastQuarter">上季度</SelectItem>
                <SelectItem value="year">本年</SelectItem>
                <SelectItem value="lastYear">去年</SelectItem>
                <SelectItem value="custom">自定义范围</SelectItem>
              </SelectContent>
            </Select>
            {isCustomRange && (
              <div className="hidden sm:flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="border rounded-md px-3 py-1.5 text-sm"
                />
                <span className="text-gray-500">至</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="border rounded-md px-3 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
          {isCustomRange && (
            <div className="sm:hidden flex items-center gap-2 mt-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm flex-1 min-w-0"
              />
              <span className="text-gray-500 flex-shrink-0">至</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm flex-1 min-w-0"
              />
            </div>
          )}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索科目、教练、学员..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-sm text-gray-500 mt-2">
            共 {sortedLessons.length} 条记录，总时长 {totalTimeDisplay}
          </div>
        </CardHeader>
        <CardContent>
          {/* 桌面端表格 */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>科目</TableHead>
                  <TableHead>教练</TableHead>
                  <TableHead>学员</TableHead>
                  <TableHead>校区</TableHead>
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
                ) : paginatedLessons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">暂无课时记录</TableCell>
                  </TableRow>
                ) : (
                  paginatedLessons.map((lesson) => (
                    <TableRow key={lesson.id}>
                      <TableCell>{lesson.date}</TableCell>
                      <TableCell>{lesson.subject}</TableCell>
                      <TableCell>{lesson.coach}</TableCell>
                      <TableCell>{lesson.student}</TableCell>
                      <TableCell>{lesson.campus}</TableCell>
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
          </div>

          {/* 手机端卡片列表 */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : paginatedLessons.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无课时记录</div>
            ) : (
              paginatedLessons.map((lesson) => (
                <div key={lesson.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium">{lesson.subject}</div>
                      <div className="text-sm text-gray-500">{lesson.date}</div>
                    </div>
                    <Badge variant={statusMap[lesson.status]?.variant || 'default'}>
                      {statusMap[lesson.status]?.label || lesson.status}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1 mb-2">
                    <div><span className="text-gray-500">教练：</span>{lesson.coach}</div>
                    <div><span className="text-gray-500">学员：</span>{lesson.student}</div>
                    {lesson.campus && <div><span className="text-gray-500">校区：</span>{lesson.campus}</div>}
                    <div><span className="text-gray-500">时长：</span>{lesson.duration}分钟</div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {lesson.status === 'pending' && (
                      <Button variant="ghost" size="sm" onClick={() => handleConfirm(lesson)}>
                        <Check className="h-4 w-4 text-green-600 mr-1" />确认
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(lesson)}>
                      <Edit className="h-4 w-4 mr-1" />编辑
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedLesson(lesson); setDeleteDialogOpen(true) }}>
                      <Trash2 className="h-4 w-4 mr-1 text-red-500" />删除
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">
                共 {sortedLessons.length} 条记录，第 {currentPage}/{totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  上一页
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
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
