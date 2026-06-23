'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit, Clock, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ClubSelector } from '@/components/club-selector'
import { authFetch } from '@/lib/fetch-client'

// 本地日期格式化（避免时区偏移）
function getLocalDateStr(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
  hasLesson?: boolean
}

interface Subject { id: number; name: string; durationMinutes: number }
interface Coach { id: number; name: string }
interface Campus { id: number; name: string }
interface Student { id: number; name: string }

export default function SchedulePage() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = React.useState(0)
  const [courses, setCourses] = React.useState<CourseData[]>([])
  const [loading, setLoading] = React.useState(false)
  // 动画状态：idle-无动画, preparing-准备中, true-滑动中
  const [isAnimating, setIsAnimating] = React.useState<boolean | 'preparing'>(false)
  const [animDirection, setAnimDirection] = React.useState<'left' | 'right'>('left')
  // 用于动画的旧数据
  const [prevWeekOffset, setPrevWeekOffset] = React.useState<number | null>(null)
  const [prevCourses, setPrevCourses] = React.useState<CourseData[]>([])
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false)
  const [selectedCourse, setSelectedCourse] = React.useState<CourseData | null>(null)
  const [courseRecorded, setCourseRecorded] = React.useState(false)
  const [recording, setRecording] = React.useState(false)
  const [coachFilter, setCoachFilter] = React.useState('all')
  const [role, setRole] = React.useState('')

  // 下拉选项数据
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [coaches, setCoaches] = React.useState<Coach[]>([])
  const [campuses, setCampuses] = React.useState<Campus[]>([])
  const [students, setStudents] = React.useState<Student[]>([])
  const [coachClubs, setCoachClubs] = React.useState<{id: number, name: string}[]>([])

  // 表单状态
  const [form, setForm] = React.useState({
    clubId: '',
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

  const weekDates = React.useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const today = new Date()
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()

  // 触摸滑动处理（左滑下一周，右滑上一周）
  const touchStartX = React.useRef(0)
  const touchStartY = React.useRef(0)
  const touchStartTime = React.useRef(0)
  const calendarRef = React.useRef<HTMLDivElement>(null)

  // 使用原生事件监听器来阻止浏览器手势（React 事件不够可靠）
  React.useEffect(() => {
    const el = calendarRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      touchStartTime.current = Date.now()
    }

    const onTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - touchStartX.current
      const deltaY = e.touches[0].clientY - touchStartY.current
      // 水平滑动时阻止浏览器默认行为（防止回退）
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && Math.abs(deltaX) > 10) {
        e.preventDefault()
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  // 处理触摸结束
  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    const duration = Date.now() - touchStartTime.current
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) && duration < 500 && isAnimating === false) {
      if (deltaX < 0) {
        // 左滑 → 下一周
        animateWeekChange(1)
      } else {
        // 右滑 → 上一周
        animateWeekChange(-1)
      }
    }
  }

  // 获取指定偏移的周日期
  const getWeekDatesForOffset = (offset: number) => {
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

  // 获取指定日期的课程
  const getCoursesForDate = (dateStr: string, courseList: CourseData[]) => {
    return courseList.filter((c) => c.date === dateStr)
  }

  // 渲染日历网格
  const renderCalendarGrid = (dates: Date[], courseList: CourseData[]) => {
    return (
      <div className="flex" style={{ minHeight: `${hours.length * HOUR_HEIGHT + 40}px` }}>
        {/* 时间列 */}
        <div className="w-9 flex-shrink-0 relative border-r">
          <div className="h-10 border-b"></div>
          {hours.map((hour, i) => (
            <div
              key={hour}
              className="absolute w-full text-[10px] text-gray-400 text-right pr-1"
              style={{ top: `${40 + i * HOUR_HEIGHT}px`, transform: 'translateY(-50%)' }}
            >
              {hour}
            </div>
          ))}
        </div>

        {/* 日列容器 */}
        {dates.map((d, dayIdx) => {
          const dateStr = getLocalDateStr(d)
          const dayCourses = courseList.filter((c) => c.date === dateStr)
          const layout = getCourseLayout(dayCourses)

          return (
            <div key={dayIdx} className="flex-1 relative border-l">
              <div className={`h-10 border-b flex items-center justify-center text-xs ${isToday(d) ? 'text-blue-500 font-bold bg-blue-50' : 'text-gray-500'}`}>
                <div>
                  <div className="text-[10px]">{dayNames[dayIdx]}</div>
                  <div>{d.getDate()}</div>
                </div>
              </div>

              <div
                className="relative cursor-pointer hover:bg-gray-50/50"
                style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest('[data-course-id]')) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const y = e.clientY - rect.top
                  const hourIdx = Math.floor(y / HOUR_HEIGHT)
                  const hour = hours[hourIdx] || hours[0]
                  const startTime = `${String(hour).padStart(2, '0')}:00`
                  const endHour = hour + 1
                  const endTime = `${String(Math.min(endHour, 23)).padStart(2, '0')}:00`
                  const stored = localStorage.getItem('user')
                  const user = stored ? JSON.parse(stored) : null
                  setForm({
                    clubId: '',
                    subjectId: '',
                    coachId: user?.role === 'coach' && user?.id ? String(user.id) : '',
                    campusId: '',
                    scheduledDate: dateStr,
                    startTime,
                    endTime,
                    location: '',
                    remark: '',
                    studentIds: [],
                  })
                  setDialogOpen(true)
                }}
              >
                {hours.map((hour, i) => (
                  <div
                    key={hour}
                    className="absolute w-full border-b border-gray-100"
                    style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                  />
                ))}

                {isToday(d) && (
                  <div className="absolute inset-0 bg-blue-50/20 pointer-events-none" />
                )}

                {dayCourses.map((course) => {
                  const pos = layout.get(course.id) || { left: 0, width: 100 }
                  const top = getCourseTop(course)
                  const height = getCourseHeight(course)

                  return (
                    <div
                      key={course.id}
                      data-course-id={course.id}
                      className={`absolute text-white text-[10px] leading-tight rounded cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${
                        course.hasLesson
                          ? `${getCourseColor(course.id)} opacity-70 ring-2 ring-white/50`
                          : getCourseColor(course.id)
                      }`}
                      style={{
                        top: `${top}px`,
                        height: `${height - 2}px`,
                        left: `calc(${pos.left}% + 1px)`,
                        width: `calc(${pos.width}% - 2px)`,
                      }}
                      onClick={() => {
                        setSelectedCourse(course)
                        setDetailDialogOpen(true)
                        checkCourseRecorded(course.id)
                      }}
                    >
                      <div className="font-medium truncate px-0.5">{course.subject}</div>
                      <div className="opacity-80 truncate px-0.5">{course.coach}</div>
                      {pos.width > 30 && course.students && (
                        <div className="opacity-70 truncate px-0.5">{course.students}</div>
                      )}
                      {course.hasLesson && pos.width > 25 && (
                        <div className="absolute top-0.5 right-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 带动画的周切换
  const animateWeekChange = (direction: number) => {
    if (isAnimating) return
    // 保存旧数据
    setPrevWeekOffset(weekOffset)
    setPrevCourses(courses)
    setAnimDirection(direction > 0 ? 'left' : 'right')
    // 先设置新内容到屏幕外（无动画）
    setIsAnimating('preparing')
    // 切换到新周
    setWeekOffset(prev => prev + direction)
    // 然后开始动画
    requestAnimationFrame(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setIsAnimating(false)
        setPrevWeekOffset(null)
      }, 350)
    })
  }

  // 加载下拉选项
  const loadOptions = React.useCallback(async () => {
    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : null
    let clubId = localStorage.getItem('currentClubId')
    // 当未选择俱乐部时，从用户所属俱乐部中取第一个来加载选项
    if (!clubId || clubId === 'all') {
      try {
        const clubsRes = await authFetch('/api/auth/me/clubs')
        if (clubsRes.ok) {
          const clubs = await clubsRes.json()
          setCoachClubs(clubs)
          if (clubs.length > 0) clubId = String(clubs[0].id)
        }
      } catch {}
      if (!clubId || clubId === 'all') return
    }
    try {
      const studentUrl = (user?.role === 'coach' || user?.role === 'part_time_coach') && user?.id
        ? `/api/students?clubId=${clubId}&coachId=${user.id}`
        : `/api/students?clubId=${clubId}`
      // 选择具体俱乐部时，只加载该俱乐部的科目（不传 coachId，避免返回私人科目）
      const subjectUrl = `/api/subjects?clubId=${clubId}`
      // 俱乐部管理员也能当教练，需要同时查询管理员列表
      const coachPromises = [
        fetch(subjectUrl),
        fetch(`/api/users?role=coach,part_time_coach,full_time_coach&clubId=${clubId}`),
        fetch(`/api/campuses?clubId=${clubId}`),
        fetch(studentUrl),
      ]
      if (user?.role === 'club_admin' || user?.role === 'full_time_coach') {
        coachPromises.push(fetch(`/api/users?role=club_admin&clubId=${clubId}`))
      }
      const [subRes, coachRes, campusRes, studentRes, adminRes] = await Promise.all(coachPromises)
      const safeJson = async (res: Response) => {
        if (!res.ok) return []
        try { return await res.json() } catch { return [] }
      }
      const [subData, coachData, campusData, studentData] = await Promise.all([
        safeJson(subRes), safeJson(coachRes), safeJson(campusRes), safeJson(studentRes),
      ])
      const adminData = adminRes ? await safeJson(adminRes) : []
      setSubjects(subData)
      // 兼职教练只能选自己；俱乐部管理员/全职教练可以选所有教练+管理员
      if ((user?.role === 'coach' || user?.role === 'part_time_coach') && user?.id) {
        setCoaches(coachData.filter((c: Coach) => c.id === user.id))
      } else {
        // 合并教练和管理员列表（去重）
        const coachMap = new Map<number, Coach>()
        for (const c of coachData) coachMap.set(c.id, c)
        for (const a of adminData) coachMap.set(a.id, { id: a.id, name: a.name })
        setCoaches(Array.from(coachMap.values()))
      }
      setCampuses(campusData)
      setStudents(studentData)

      // 加载用户的俱乐部列表（用于课程表单中的俱乐部选择）
      try {
        const clubsRes = await authFetch('/api/auth/me/clubs')
        if (clubsRes.ok) {
          const clubsData = await clubsRes.json()
          setCoachClubs(clubsData)
        }
      } catch {}
    } catch (e) {
      console.error('加载选项失败:', e)
    }
  }, [])

  // 加载指定俱乐部的下拉选项（切换俱乐部时使用）
  const loadOptionsForClub = React.useCallback(async (targetClubId: string) => {
    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : null
    try {
      const studentUrl = (user?.role === 'coach' || user?.role === 'part_time_coach') && user?.id
        ? `/api/students?clubId=${targetClubId}&coachId=${user.id}`
        : `/api/students?clubId=${targetClubId}`
      // 选择具体俱乐部时，只加载该俱乐部的科目（不传 coachId，避免返回私人科目）
      const subjectUrl = `/api/subjects?clubId=${targetClubId}`
      const coachPromises = [
        fetch(subjectUrl),
        fetch(`/api/users?role=part_time_coach,full_time_coach&clubId=${targetClubId}`),
        fetch(`/api/campuses?clubId=${targetClubId}`),
        fetch(studentUrl),
      ]
      if (user?.role === 'club_admin' || user?.role === 'full_time_coach') {
        coachPromises.push(fetch(`/api/users?role=club_admin&clubId=${targetClubId}`))
      }
      const [subRes, coachRes, campusRes, studentRes, adminRes] = await Promise.all(coachPromises)
      const safeJson = async (res: Response) => {
        if (!res.ok) return []
        try { return await res.json() } catch { return [] }
      }
      const [subData, coachData, campusData, studentData] = await Promise.all([
        safeJson(subRes), safeJson(coachRes), safeJson(campusRes), safeJson(studentRes),
      ])
      const adminData = adminRes ? await safeJson(adminRes) : []
      setSubjects(subData)
      if ((user?.role === 'coach' || user?.role === 'part_time_coach') && user?.id) {
        setCoaches(coachData.filter((c: Coach) => c.id === user.id))
      } else {
        const coachMap = new Map<number, Coach>()
        for (const c of coachData) coachMap.set(c.id, c)
        for (const a of adminData) coachMap.set(a.id, { id: a.id, name: a.name })
        setCoaches(Array.from(coachMap.values()))
      }
      setCampuses(campusData)
      setStudents(studentData)
    } catch (e) {
      console.error('加载俱乐部选项失败:', e)
    }
  }, [])

  // 加载课程数据
  const loadCourses = React.useCallback(async () => {
    // 获取当前用户信息
    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : null
    const clubId = localStorage.getItem('currentClubId')

    setLoading(true)
    try {
      const dates = getWeekDates(weekOffset)
      const startDate = getLocalDateStr(dates[0])
      const endDate = getLocalDateStr(dates[6])

      let url: string
      if ((user?.role === 'coach' || user?.role === 'part_time_coach') && user?.id) {
        // 兼职教练：只看自己的课程，选择具体俱乐部时按俱乐部过滤
        url = `/api/courses?startDate=${startDate}&endDate=${endDate}&coachId=${user.id}`
        if (clubId && clubId !== 'all') {
          url += `&clubId=${clubId}`
        }
      } else {
        // 管理员/全职教练：按俱乐部过滤
        if (!clubId) { setLoading(false); return }
        url = `/api/courses?clubId=${clubId}&startDate=${startDate}&endDate=${endDate}`
        if (coachFilter !== 'all') {
          url += `&coachId=${coachFilter}`
        }
      }

      const res = await authFetch(url)
      const data = await res.json()
      setCourses(data)
    } catch (e) {
      console.error('加载课程失败:', e)
    } finally {
      setLoading(false)
    }
  }, [weekOffset, coachFilter])

  React.useEffect(() => {
    loadCourses()
  }, [loadCourses])

  // 获取用户角色
  React.useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      setRole(user.role || '')
    }
  }, [])

  React.useEffect(() => {
    loadOptions()
  }, [loadOptions])

  // 兼职教练角色自动选中自己
  React.useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      if ((user.role === 'coach' || user.role === 'part_time_coach') && user.id) {
        setForm((prev) => ({ ...prev, coachId: String(user.id) }))
      }
    }
  }, [])

  // 监听俱乐部切换
  React.useEffect(() => {
    const handleClubChanged = () => {
      loadCourses()
      loadOptions()
    }
    window.addEventListener('clubChanged', handleClubChanged)
    return () => window.removeEventListener('clubChanged', handleClubChanged)
  }, [loadCourses, loadOptions])

  // 创建课程
  const handleCreate = async () => {
    // 当只有一个俱乐部时，自动使用该俱乐部
    const effectiveClubId = form.clubId || (coachClubs.length === 1 ? String(coachClubs[0].id) : '')
    if (!effectiveClubId || !form.subjectId || !form.coachId || !form.scheduledDate) {
      alert('请填写必要信息')
      return
    }

    try {
      const res = await authFetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: effectiveClubId,
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
      await authFetch(`/api/courses/${selectedCourse.id}`, { method: 'DELETE' })
      setDeleteDialogOpen(false)
      setSelectedCourse(null)
      loadCourses()
    } catch (e) {
      alert('删除失败')
    }
  }

  // 检查课程是否已记录课时
  const checkCourseRecorded = async (courseId: number) => {
    try {
      const res = await authFetch(`/api/courses/${courseId}/lessons`)
      const data = await res.json()
      setCourseRecorded(data.recorded)
    } catch {
      setCourseRecorded(false)
    }
  }

  // 记录课时
  const handleRecordLesson = async () => {
    if (!selectedCourse) return
    setRecording(true)
    try {
      const res = await authFetch(`/api/courses/${selectedCourse.id}/lessons`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setCourseRecorded(true)
        setDetailDialogOpen(false)
        // 跳转到课时记录页面，方便直接确认
        router.push(`/lessons?courseId=${selectedCourse.id}`)
      } else {
        alert(data.error || '记录失败')
      }
    } catch {
      alert('记录课时失败')
    } finally {
      setRecording(false)
    }
  }

  const resetForm = () => {
    const currentClubId = localStorage.getItem('currentClubId')
    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : null
    setForm({
      clubId: currentClubId && currentClubId !== 'all' ? currentClubId : '',
      subjectId: '',
      coachId: user?.role === 'coach' && user?.id ? String(user.id) : '',
      campusId: '',
      scheduledDate: '', startTime: '09:00', endTime: '10:00',
      location: '', remark: '', studentIds: [],
    })
  }

  // 每小时高度（px）
  const HOUR_HEIGHT = 48

  // 计算课程顶部偏移（从 hours 起始时间算起）
  const getCourseTop = (course: CourseData) => {
    const [sh, sm] = course.startTime.split(':').map(Number)
    return (sh - hours[0]) * HOUR_HEIGHT + (sm / 60) * HOUR_HEIGHT
  }

  // 计算课程高度（分钟 → px）
  const getCourseHeight = (course: CourseData) => {
    const [sh, sm] = course.startTime.split(':').map(Number)
    const [eh, em] = course.endTime.split(':').map(Number)
    const minutes = (eh * 60 + em) - (sh * 60 + sm)
    return Math.max((minutes / 60) * HOUR_HEIGHT, 20)
  }

  // 判断两门课程是否有时间重叠
  const coursesOverlap = (a: CourseData, b: CourseData): boolean => {
    return a.startTime < b.endTime && b.startTime < a.endTime
  }

  // 根据课程 ID 分配颜色
  const getCourseColor = (courseId: number) => {
    return courseColors[courseId % courseColors.length]
  }

  // 获取某天课程的并排位置信息
  // 返回每门课程的 { left%, width% }
  // 只有真正时间重叠的课程才并排，不重叠的占满整列
  const getCourseLayout = (dayCourses: CourseData[]) => {
    const layout = new Map<number, { left: number; width: number }>()
    if (dayCourses.length === 0) return layout

    // 所有课程默认占满整列
    for (const c of dayCourses) {
      layout.set(c.id, { left: 0, width: 100 })
    }

    // 找出所有重叠组（连通分量）
    const sorted = [...dayCourses].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const groups: CourseData[][] = []
    const visited = new Set<number>()

    for (const course of sorted) {
      if (visited.has(course.id)) continue
      const group: CourseData[] = [course]
      visited.add(course.id)
      // BFS 查找所有与组内课程重叠的课程
      let i = 0
      while (i < group.length) {
        for (const other of sorted) {
          if (!visited.has(other.id) && coursesOverlap(group[i], other)) {
            group.push(other)
            visited.add(other.id)
          }
        }
        i++
      }
      if (group.length > 1) {
        groups.push(group)
      }
    }

    // 对每个重叠组分配列位置
    for (const group of groups) {
      const columns: CourseData[][] = []
      for (const course of group) {
        let placed = false
        for (let col = 0; col < columns.length; col++) {
          const lastInCol = columns[col][columns[col].length - 1]
          if (!coursesOverlap(lastInCol, course)) {
            columns[col].push(course)
            placed = true
            break
          }
        }
        if (!placed) {
          columns.push([course])
        }
      }
      const totalCols = columns.length
      for (let col = 0; col < totalCols; col++) {
        for (const c of columns[col]) {
          layout.set(c.id, { left: (col / totalCols) * 100, width: 100 / totalCols })
        }
      }
    }

    return layout
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">排课管理</h1>
        <div className="flex items-center gap-3">
          <ClubSelector />
          {/* 教练筛选（仅管理员可见） */}
          {(role === 'club_admin' || role === 'super_admin') && (
            <Select value={coachFilter} onValueChange={setCoachFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="筛选教练" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部教练</SelectItem>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
              {coachClubs.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">俱乐部 *</label>
                  <Select value={form.clubId} onValueChange={(v) => {
                    setForm({ ...form, clubId: v })
                    loadOptionsForClub(v)
                  }}>
                    <SelectTrigger><SelectValue placeholder="选择俱乐部" /></SelectTrigger>
                    <SelectContent>
                      {coachClubs.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => animateWeekChange(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {weekDates[0].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
            {' - '}
            {weekDates[6].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
          </span>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => {
              // 直接跳转到本周（带动画）
              setPrevWeekOffset(weekOffset)
              setPrevCourses(courses)
              setAnimDirection(weekOffset > 0 ? 'right' : 'left')
              setIsAnimating('preparing')
              setWeekOffset(0)
              requestAnimationFrame(() => {
                setIsAnimating(true)
                setTimeout(() => {
                  setIsAnimating(false)
                  setPrevWeekOffset(null)
                }, 350)
              })
            }}>
              回到本周
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => animateWeekChange(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card
        ref={calendarRef}
        onTouchEnd={handleTouchEnd}
        className="calendar-container overflow-hidden"
      >
        <CardContent className="p-0 relative" style={{ minHeight: `${hours.length * HOUR_HEIGHT + 40}px` }}>
          {/* 旧内容（从中心滑出） */}
          {isAnimating !== false && prevWeekOffset !== null && (
            <div
              className="absolute inset-0 overflow-x-auto"
              style={{
                transition: isAnimating === true ? 'transform 0.3s ease-out' : 'none',
                transform: isAnimating === true
                  ? (animDirection === 'left' ? 'translateX(-100%)' : 'translateX(100%)')
                  : 'translateX(0)',
              }}
            >
              {renderCalendarGrid(getWeekDatesForOffset(prevWeekOffset), prevCourses)}
            </div>
          )}
          {/* 新内容（从屏幕外滑入） */}
          <div
            className="overflow-x-auto calendar-scroll-container"
            style={{
              transition: isAnimating === true ? 'transform 0.3s ease-out' : 'none',
              transform: isAnimating === 'preparing'
                ? (animDirection === 'left' ? 'translateX(100%)' : 'translateX(-100%)')
                : 'translateX(0)',
            }}
          >
            {renderCalendarGrid(weekDates, courses)}
          </div>
          {loading && (
            <div className="text-center py-4 text-sm text-gray-500">加载中...</div>
          )}
          {!loading && courses.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">本周暂无课程安排</div>
          )}
        </CardContent>
      </Card>

      {/* 课程详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCourse?.subject}
              {selectedCourse?.hasLesson && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  已记录
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">时间</span>
                <span>{selectedCourse.date} {selectedCourse.startTime}-{selectedCourse.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">教练</span>
                <span>{selectedCourse.coach}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">校区</span>
                <span>{selectedCourse.campus}</span>
              </div>
              {selectedCourse.students && (
                <div className="flex justify-between">
                  <span className="text-gray-500">学员</span>
                  <span>{selectedCourse.students}</span>
                </div>
              )}
              {courseRecorded && (
                <div className="flex items-center gap-1 text-green-600 text-xs mt-1">
                  <Clock className="h-3 w-3" />
                  <span>已记录课时</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>关闭</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDetailDialogOpen(false)
                setDeleteDialogOpen(true)
              }}
            >
              取消课程
            </Button>
            <Button
              disabled={courseRecorded || recording}
              onClick={handleRecordLesson}
            >
              {recording ? '记录中...' : courseRecorded ? '已记录课时' : '记录课时'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
