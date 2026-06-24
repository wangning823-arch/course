'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { authFetch } from '@/lib/fetch-client'
import { useUserStore } from '@/stores/user-store'
import { ParentBookDialog } from '../book/dialog'

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

const courseColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500']
const bookingColor = 'bg-amber-500'
const bookingRejectedColor = 'bg-red-400'

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
  isBooking?: boolean
  bookingStatus?: string
  rejectReason?: string
}

interface Child {
  id: number
  name: string
  club?: { id: number; name: string }
  coach?: { id: number; name: string }
}

export default function ParentCoursesPage() {
  const searchParams = useSearchParams()
  const user = useUserStore((s) => s.user)
  const [weekOffset, setWeekOffset] = React.useState(0)
  const [courses, setCourses] = React.useState<CourseData[]>([])
  const [bookings, setBookings] = React.useState<CourseData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [children, setChildren] = React.useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = React.useState<number | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false)
  const [selectedCourse, setSelectedCourse] = React.useState<CourseData | null>(null)
  const [courseRecorded, setCourseRecorded] = React.useState(false)
  const [bookDialogOpen, setBookDialogOpen] = React.useState(false)
  const [bookDefaultDate, setBookDefaultDate] = React.useState('')
  const [bookDefaultTime, setBookDefaultTime] = React.useState('')

  // 动画状态
  const [isAnimating, setIsAnimating] = React.useState<boolean | 'preparing'>(false)
  const [animDirection, setAnimDirection] = React.useState<'left' | 'right'>('left')
  const [prevWeekOffset, setPrevWeekOffset] = React.useState<number | null>(null)
  const [prevCourses, setPrevCourses] = React.useState<CourseData[]>([])

  const touchStartX = React.useRef(0)
  const touchStartY = React.useRef(0)
  const touchStartTime = React.useRef(0)
  const calendarRef = React.useRef<HTMLDivElement>(null)

  // 合并课程和预约用于显示
  const allCourses = React.useMemo(() => [...courses, ...bookings], [courses, bookings])

  const weekDates = React.useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const today = new Date()
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()

  // 每小时高度
  const [hourHeight, setHourHeight] = React.useState(24)

  React.useEffect(() => {
    const updateHeight = () => {
      const isMobile = window.innerWidth < 768
      if (isMobile) {
        const screenHeight = window.innerHeight
        const headerHeight = 120
        const availableHeight = screenHeight - headerHeight
        setHourHeight(Math.floor((availableHeight - 40) / 14))
      } else {
        setHourHeight(48)
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const HOUR_HEIGHT = hourHeight

  // 阻止浏览器手势
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

  // 获取孩子列表
  React.useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await authFetch('/api/parent/children')
        if (res.ok) {
          const data = await res.json()
          setChildren(data.linked || [])
        }
      } catch (error) {
        console.error('获取孩子列表失败:', error)
      }
    }
    fetchChildren()
  }, [])

  // 默认选中第一个孩子（支持URL参数childId）
  React.useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      const childIdParam = searchParams.get('childId')
      if (childIdParam) {
        const id = parseInt(childIdParam)
        if (children.some(c => c.id === id)) {
          setSelectedChildId(id)
          return
        }
      }
      setSelectedChildId(children[0].id)
    }
  }, [children, selectedChildId, searchParams])

  // 加载课程和预约
  const loadCourses = React.useCallback(async () => {
    if (!selectedChildId) return
    setLoading(true)
    try {
      const dates = getWeekDates(weekOffset)
      const startDate = getLocalDateStr(dates[0])
      const endDate = getLocalDateStr(dates[6])

      // 并行加载课程和预约
      const [courseRes, bookingRes] = await Promise.all([
        authFetch(`/api/courses?startDate=${startDate}&endDate=${endDate}&studentId=${selectedChildId}`),
        authFetch(`/api/bookings?status=pending`)
      ])

      const courseData = await courseRes.json()
      setCourses(courseData)

      // 处理预约数据，过滤出当前孩子且在日期范围内的预约
      if (bookingRes.ok) {
        const bookingData = await bookingRes.json()
        const filteredBookings = bookingData
          .filter((b: any) => {
            const bookingDate = new Date(b.date)
            const bookingDateStr = getLocalDateStr(bookingDate)
            return b.studentId === selectedChildId &&
              bookingDateStr >= startDate &&
              bookingDateStr <= endDate
          })
          .map((b: any) => {
            const bookingDate = new Date(b.date)
            const dateStr = getLocalDateStr(bookingDate)
            return {
              id: b.id,
              subject: b.subject?.name || '未指定',
              coach: b.coach?.name || '未知',
              campus: '-',
              date: dateStr,
              startTime: b.startTime,
              endTime: b.endTime,
              students: '',
              status: b.status,
              isBooking: true,
              bookingStatus: b.status,
              rejectReason: b.rejectReason || undefined,
            }
          })
        setBookings(filteredBookings)
      }
    } catch (e) {
      console.error('加载课程失败:', e)
    } finally {
      setLoading(false)
    }
  }, [weekOffset, selectedChildId])

  React.useEffect(() => {
    loadCourses()
  }, [loadCourses])

  // 周切换动画
  const animateWeekChange = (direction: number) => {
    if (isAnimating) return
    setPrevWeekOffset(weekOffset)
    setPrevCourses(courses)
    setAnimDirection(direction > 0 ? 'left' : 'right')
    setIsAnimating('preparing')
    setWeekOffset(prev => prev + direction)
    requestAnimationFrame(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setIsAnimating(false)
        setPrevWeekOffset(null)
      }, 350)
    })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    const duration = Date.now() - touchStartTime.current
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) && duration < 500 && isAnimating === false) {
      animateWeekChange(deltaX < 0 ? 1 : -1)
    }
  }

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

  const getCourseTop = (course: CourseData) => {
    const [sh, sm] = course.startTime.split(':').map(Number)
    return (sh - hours[0]) * HOUR_HEIGHT + (sm / 60) * HOUR_HEIGHT
  }

  const getCourseHeight = (course: CourseData) => {
    const [sh, sm] = course.startTime.split(':').map(Number)
    const [eh, em] = course.endTime.split(':').map(Number)
    const minutes = (eh * 60 + em) - (sh * 60 + sm)
    return Math.max((minutes / 60) * HOUR_HEIGHT, 20)
  }

  const coursesOverlap = (a: CourseData, b: CourseData): boolean => {
    return a.startTime < b.endTime && b.startTime < a.endTime
  }

  const coachStudentColorMap = React.useRef(new Map<string, number>())
  const getCourseColor = (course: CourseData) => {
    // 预约使用特殊颜色
    if (course.isBooking) {
      if (course.bookingStatus === 'rejected') return bookingRejectedColor
      return bookingColor
    }
    const key = `${course.coach}-${course.students || ''}`
    if (!coachStudentColorMap.current.has(key)) {
      const size = coachStudentColorMap.current.size
      coachStudentColorMap.current.set(key, size % courseColors.length)
    }
    return courseColors[coachStudentColorMap.current.get(key)!]
  }

  const getCourseLayout = (dayCourses: CourseData[]) => {
    const layout = new Map<number, { left: number; width: number }>()
    if (dayCourses.length === 0) return layout
    for (const c of dayCourses) {
      layout.set(c.id, { left: 0, width: 100 })
    }
    const sorted = [...dayCourses].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const groups: CourseData[][] = []
    const visited = new Set<number>()
    for (const course of sorted) {
      if (visited.has(course.id)) continue
      const group: CourseData[] = [course]
      visited.add(course.id)
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
      if (group.length > 1) groups.push(group)
    }
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
        if (!placed) columns.push([course])
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
                className="relative"
                style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest('[data-course-id]')) return
                  // 点击空区域 → 打开预约弹窗
                  const rect = e.currentTarget.getBoundingClientRect()
                  const y = e.clientY - rect.top
                  const hourIdx = Math.floor(y / HOUR_HEIGHT)
                  const hour = hours[hourIdx] || hours[0]

                  // 检查是否是过去的时间，过去的时间不能预约
                  const now = new Date()
                  const clickedDateTime = new Date(dateStr + 'T' + `${String(hour).padStart(2, '0')}:00:00`)
                  if (clickedDateTime < now) return

                  setBookDefaultDate(dateStr)
                  setBookDefaultTime(`${String(hour).padStart(2, '0')}:00`)
                  setBookDialogOpen(true)
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
                  const isBooking = course.isBooking

                  return (
                    <div
                      key={`${isBooking ? 'booking' : 'course'}-${course.id}`}
                      data-course-id={course.id}
                      className={`absolute text-white text-[10px] leading-tight rounded cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${
                        isBooking
                          ? `${getCourseColor(course)} border-2 border-dashed border-white/70`
                          : course.hasLesson
                            ? `${getCourseColor(course)} opacity-50 ring-2 ring-white/50`
                            : getCourseColor(course)
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
                        if (!isBooking) checkCourseRecorded(course.id)
                      }}
                    >
                      <div className="font-medium truncate px-0.5">{course.subject}</div>
                      <div className="opacity-80 truncate px-0.5">{course.coach}</div>
                      {isBooking && pos.width > 25 && (
                        <div className="opacity-90 truncate px-0.5 font-medium">
                          {course.bookingStatus === 'pending' ? '待确认' : course.bookingStatus === 'rejected' ? '已拒绝' : '预约'}
                        </div>
                      )}
                      {!isBooking && pos.width > 30 && course.students && (
                        <div className="opacity-70 truncate px-0.5">{course.students}</div>
                      )}
                      {!isBooking && course.hasLesson && pos.width > 25 && (
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

  const currentChild = children.find(c => c.id === selectedChildId)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/parent" className="hover:text-gray-700">首页</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900 font-medium">课程查看</span>
      </div>

      {/* 孩子选择（多个孩子时显示） */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map((child) => (
            <Button
              key={child.id}
              variant={selectedChildId === child.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChildId(child.id)}
            >
              <Users className="h-4 w-4 mr-1" />
              {child.name}
            </Button>
          ))}
        </div>
      )}

      {/* 当前孩子信息 */}
      {currentChild && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">{currentChild.name}的课程</p>
                {currentChild.club && (
                  <p className="text-xs text-gray-500">{currentChild.club.name}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          <div
            className="overflow-x-auto calendar-scroll-container"
            style={{
              transition: isAnimating === true ? 'transform 0.3s ease-out' : 'none',
              transform: isAnimating === 'preparing'
                ? (animDirection === 'left' ? 'translateX(100%)' : 'translateX(-100%)')
                : 'translateX(0)',
            }}
          >
            {renderCalendarGrid(weekDates, allCourses)}
          </div>
          {loading && (
            <div className="text-center py-4 text-sm text-gray-500">加载中...</div>
          )}
          {!loading && allCourses.length === 0 && selectedChildId && (
            <div className="text-center py-8 text-sm text-gray-500">本周暂无课程安排</div>
          )}
          {!selectedChildId && children.length === 0 && !loading && (
            <div className="text-center py-8 text-sm text-gray-500">暂无关联的孩子</div>
          )}
        </CardContent>
      </Card>

      {/* 课程详情弹窗（只读） */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCourse?.subject}
              {selectedCourse?.isBooking ? (
                <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${
                  selectedCourse?.bookingStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                  selectedCourse?.bookingStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {selectedCourse?.bookingStatus === 'pending' ? '待确认' :
                   selectedCourse?.bookingStatus === 'rejected' ? '已拒绝' : '已确认'}
                </span>
              ) : selectedCourse?.hasLesson && (
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
              {!selectedCourse.isBooking && (
                <div className="flex justify-between">
                  <span className="text-gray-500">校区</span>
                  <span>{selectedCourse.campus}</span>
                </div>
              )}
              {selectedCourse.students && (
                <div className="flex justify-between">
                  <span className="text-gray-500">学员</span>
                  <span>{selectedCourse.students}</span>
                </div>
              )}
              {!selectedCourse.isBooking && courseRecorded && (
                <div className="flex items-center gap-1 text-green-600 text-xs mt-1">
                  <Check className="h-3 w-3" />
                  <span>已记录课时</span>
                </div>
              )}
              {selectedCourse.isBooking && selectedCourse.bookingStatus === 'rejected' && selectedCourse.rejectReason && (
                <div className="bg-red-50 rounded-md p-3 mt-2">
                  <p className="text-sm font-medium text-red-700 mb-1">拒绝原因</p>
                  <p className="text-sm text-red-600">{selectedCourse.rejectReason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ParentBookDialog
        open={bookDialogOpen}
        onOpenChange={setBookDialogOpen}
        defaultChildId={selectedChildId}
        defaultDate={bookDefaultDate}
        defaultTime={bookDefaultTime}
      />
    </div>
  )
}
