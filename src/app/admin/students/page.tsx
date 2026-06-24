'use client'

import * as React from 'react'
import { Plus, Edit, Trash2, Search, RefreshCw, UserCheck, UserX, Users, Lock, User, Key, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ClubSelector } from '@/components/club-selector'
import { authFetch } from '@/lib/fetch-client'
import { useDebounce } from '@/hooks/use-debounce'
import { useUserStore } from '@/stores/user-store'
import { useClubStore } from '@/stores/club-store'

interface Coach { id: number; name: string }
interface Club { id: number; name: string }

export default function StudentsPage() {
  const user = useUserStore((s) => s.user)
  const currentClubId = useClubStore((s) => s.currentClubId)
  const [students, setStudents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ name: '', phone: '', gender: '1', parentName: '', parentPhone: '' })
  const [editId, setEditId] = React.useState<number | null>(null)
  const [editStudentType, setEditStudentType] = React.useState<'adult' | 'minor'>('adult')
  const [coaches, setCoaches] = React.useState<Coach[]>([])
  const [coachClubs, setCoachClubs] = React.useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = React.useState<string>('')
  const [studentType, setStudentType] = React.useState<'shared' | 'private' | 'solo'>('private')
  // 新增：学员类型筛选和账号创建相关状态
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'adult' | 'minor'>('all')
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = React.useState(false)
  const [createAccountStudent, setCreateAccountStudent] = React.useState<any>(null)
  const [accountPassword, setAccountPassword] = React.useState('')
  const [accountLoading, setAccountLoading] = React.useState(false)
  // 创建学员用户对话框状态
  const [createStudentDialogOpen, setCreateStudentDialogOpen] = React.useState(false)
  const [createStudentType, setCreateStudentType] = React.useState<'adult' | 'minor'>('adult')
  const [createStudentForm, setCreateStudentForm] = React.useState({
    name: '',
    phone: '',
    gender: '1',
    birthDate: '',
    parentName: '',
    parentPhone: '',
    password: '123456',
  })
  // 手机号检查状态
  const [phoneCheckResult, setPhoneCheckResult] = React.useState<{
    checking: boolean
    exists: boolean
    canAdd: boolean
    error: string | null
    user: any | null
  }>({ checking: false, exists: false, canAdd: true, error: null, user: null })

  const role = user?.role || ''
  const userId = user?.id || null

  const fetchStudents = React.useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/students?search=${debouncedSearch}`
      // 教练：默认看所有俱乐部学员，选择具体俱乐部时按俱乐部过滤
      if ((role === 'coach' || role === 'part_time_coach') && userId) {
        url += `&coachId=${userId}`
        if (currentClubId && currentClubId !== 'all') {
          url += `&clubId=${currentClubId}`
        }
      } else {
        // 管理员/全职教练：按俱乐部过滤
        if (currentClubId && currentClubId !== 'all') {
          url += `&clubId=${currentClubId}`
        }
      }
      // 按学员类型筛选
      if (typeFilter !== 'all') {
        url += `&studentType=${typeFilter}`
      }

      const res = await authFetch(url)
      if (!res.ok) {
        setStudents([])
        return
      }
      const data = await res.json()
      setStudents(data)
    } catch (error) {
      console.error('获取学员失败:', error)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, role, userId, currentClubId, typeFilter])

  // 加载教练列表（管理员用）
  const fetchCoaches = React.useCallback(async () => {
    if (role !== 'admin' && role !== 'club_admin' && role !== 'super_admin' && role !== 'full_time_coach') return
    if (!currentClubId || currentClubId === 'all') return
    try {
      const res = await authFetch(`/api/users?role=coach,part_time_coach,full_time_coach&clubId=${currentClubId}`)
      if (!res.ok) return
      const data = await res.json()
      setCoaches(data)
    } catch (e) {
      console.error('加载教练失败:', e)
    }
  }, [role, currentClubId])

  // 加载教练所属俱乐部列表
  const fetchCoachClubs = React.useCallback(async () => {
    if (role !== 'coach' && role !== 'part_time_coach') return
    try {
      const res = await authFetch('/api/auth/me/clubs')
      if (!res.ok) return
      const data = await res.json()
      setCoachClubs(data)
      // 默认选中 currentClubId 或第一个俱乐部
      if (currentClubId && currentClubId !== 'all' && data.some((c: Club) => c.id === parseInt(currentClubId))) {
        setSelectedClubId(currentClubId)
      } else if (data.length > 0) {
        setSelectedClubId(String(data[0].id))
      }
    } catch (e) {
      console.error('加载俱乐部失败:', e)
    }
  }, [role, currentClubId])

  React.useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  React.useEffect(() => {
    fetchCoaches()
    fetchCoachClubs()
  }, [fetchCoaches, fetchCoachClubs])

  // 监听俱乐部切换（Zustand store 变化时自动重新获取数据）
  React.useEffect(() => {
    fetchStudents()
    fetchCoaches()
  }, [currentClubId, fetchStudents, fetchCoaches])

  // 检查手机号是否已有用户
  const checkPhone = React.useCallback(async (phone: string, purpose: 'student' | 'parent' = 'student') => {
    if (!phone || phone.length < 11) {
      setPhoneCheckResult({ checking: false, exists: false, canAdd: true, error: null, user: null })
      return
    }

    setPhoneCheckResult(prev => ({ ...prev, checking: true }))

    try {
      const res = await authFetch('/api/students/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose }),
      })

      if (!res.ok) {
        setPhoneCheckResult({ checking: false, exists: false, canAdd: true, error: null, user: null })
        return
      }

      const data = await res.json()

      if (!data.exists) {
        setPhoneCheckResult({ checking: false, exists: false, canAdd: true, error: null, user: null })
      } else if (data.canAdd) {
        setPhoneCheckResult({
          checking: false,
          exists: true,
          canAdd: true,
          error: null,
          user: data.user,
        })
      } else {
        setPhoneCheckResult({
          checking: false,
          exists: true,
          canAdd: false,
          error: data.error || '该手机号不能使用',
          user: data.user,
        })
      }
    } catch (error) {
      console.error('检查手机号失败:', error)
      setPhoneCheckResult({ checking: false, exists: false, canAdd: true, error: null, user: null })
    }
  }, [])

  // 手机号输入防抖检查
  React.useEffect(() => {
    const phone = createStudentType === 'adult' ? createStudentForm.phone : createStudentForm.parentPhone
    if (!phone || phone.length < 11) {
      setPhoneCheckResult({ checking: false, exists: false, canAdd: true, error: null, user: null })
      return
    }

    const timer = setTimeout(() => {
      checkPhone(phone, createStudentType === 'adult' ? 'student' : 'parent')
    }, 500)

    return () => clearTimeout(timer)
  }, [createStudentForm.phone, createStudentForm.parentPhone, createStudentType, checkPhone])

  // 未成年学员：家长手机号有账号时自动填充家长姓名
  React.useEffect(() => {
    if (createStudentType === 'minor' && phoneCheckResult.exists && phoneCheckResult.user) {
      setCreateStudentForm(prev => ({
        ...prev,
        parentName: prev.parentName || phoneCheckResult.user.name,
      }))
    }
  }, [phoneCheckResult, createStudentType])

  const handleSubmit = async () => {
    try {
      const submitData: any = { ...formData, gender: parseInt(formData.gender) }

      if ((role === 'coach' || role === 'part_time_coach') && userId) {
        if (studentType === 'solo') {
          // 纯私有学员：不关联俱乐部
          submitData.clubId = null
          submitData.coachId = userId
        } else {
          // 俱乐部学员：使用选择的俱乐部
          submitData.clubId = selectedClubId ? parseInt(selectedClubId) : null
          submitData.coachId = studentType === 'private' ? userId : null
        }
      } else {
        submitData.clubId = currentClubId && currentClubId !== 'all' ? parseInt(currentClubId) : null
      }

      if (editId) {
        await authFetch(`/api/students/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        })
      } else {
        await authFetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        })
      }
      setDialogOpen(false)
      setFormData({ name: '', phone: '', gender: '1', parentName: '', parentPhone: '' })
      setEditId(null)
      fetchStudents()
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该学员吗？')) return
    try {
      const res = await authFetch(`/api/students/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchStudents()
      } else {
        const errorText = await res.text()
        let errorMsg = '删除失败'
        try {
          const errorData = JSON.parse(errorText)
          errorMsg = errorData.error || '删除失败'
        } catch {
          errorMsg = errorText || '删除失败'
        }
        alert(errorMsg)
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    }
  }

  const handleEdit = (student: any) => {
    setFormData({
      name: student.name,
      phone: student.phone || '',
      gender: String(student.gender || 1),
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
    })
    setEditStudentType(student.studentType || 'adult')
    // 判断学员归属类型
    if (!student.clubId) {
      setStudentType('solo')
    } else if (student.coachId) {
      setStudentType('private')
    } else {
      setStudentType('shared')
    }
    setEditId(student.id)
    setDialogOpen(true)
  }

  // 切换学员归属
  const handleAssign = async (studentId: number, coachId: number | null) => {
    try {
      await authFetch(`/api/students/${studentId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId }),
      })
      fetchStudents()
    } catch (error) {
      console.error('切换归属失败:', error)
    }
  }

  // 创建学员登录账号
  const handleCreateAccount = async () => {
    if (!createAccountStudent || !accountPassword) return
    setAccountLoading(true)
    try {
      const res = await authFetch('/api/students/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: createAccountStudent.id,
          phone: createAccountStudent.phone || createAccountStudent.parentPhone,
          password: accountPassword,
          studentType: createAccountStudent.studentType || 'adult',
          parentPhone: createAccountStudent.parentPhone,
        }),
      })
      if (res.ok) {
        setCreateAccountDialogOpen(false)
        setCreateAccountStudent(null)
        setAccountPassword('')
        fetchStudents()
      } else {
        const data = await res.json()
        alert(data.error || '创建账号失败')
      }
    } catch (error) {
      console.error('创建账号失败:', error)
      alert('创建账号失败')
    } finally {
      setAccountLoading(false)
    }
  }

  // 创建学员用户（同时创建学员信息和登录账号）
  const handleCreateStudentUser = async () => {
    if (!createStudentForm.name) {
      alert('请填写学员姓名')
      return
    }

    // 成年学员需要手机号，未成年学员需要家长手机号
    if (createStudentType === 'adult' && !createStudentForm.phone) {
      alert('请输入学员手机号')
      return
    }
    if (createStudentType === 'minor' && !createStudentForm.parentPhone) {
      alert('请输入家长手机号')
      return
    }

    // 需要创建账号时验证密码
    // 成年学员：手机号没有用户时需要密码
    // 未成年学员：家长没有账号时需要密码
    const needPassword = (createStudentType === 'adult' && !phoneCheckResult.exists) ||
      (createStudentType === 'minor' && !(phoneCheckResult.exists && phoneCheckResult.canAdd))
    if (needPassword) {
      if (!createStudentForm.password) {
        alert('请输入登录密码')
        return
      }
      if (createStudentForm.password.length < 6) {
        alert('密码至少需要6位')
        return
      }
    }

    // 检查是否选择了俱乐部（兼职教练可以创建纯私有学员，clubId 可以为 null）
    if ((role === 'club_admin' || role === 'full_time_coach' || role === 'super_admin') && (!currentClubId || currentClubId === 'all')) {
      alert('请先选择一个俱乐部')
      return
    }

    try {
      // 根据角色和学员归属类型确定 clubId 和 coachId
      let submitClubId: number | null = null
      let submitCoachId: number | null = null

      if (role === 'part_time_coach' || role === 'coach') {
        // 兼职教练：根据学员归属类型设置
        if (studentType === 'solo') {
          // 纯私有：不关联俱乐部
          submitClubId = null
          submitCoachId = userId
        } else {
          // 俱乐部私有：关联当前俱乐部
          submitClubId = currentClubId && currentClubId !== 'all' ? parseInt(currentClubId) : null
          submitCoachId = userId
        }
      } else {
        // 管理员/全职教练
        submitClubId = currentClubId && currentClubId !== 'all' ? parseInt(currentClubId) : null
        submitCoachId = null
      }

      const submitData: any = {
        name: createStudentForm.name,
        phone: createStudentForm.phone || null,
        gender: parseInt(createStudentForm.gender),
        birthDate: createStudentForm.birthDate || null,
        parentName: createStudentForm.parentName || null,
        parentPhone: createStudentForm.parentPhone || null,
        studentType: createStudentType,
        clubId: submitClubId,
        coachId: submitCoachId,
        password: createStudentForm.password || null,
      }

      const res = await authFetch('/api/students/create-with-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (res.ok) {
        const data = await res.json()
        setCreateStudentDialogOpen(false)
        setCreateStudentForm({
          name: '',
          phone: '',
          gender: '1',
          birthDate: '',
          parentName: '',
          parentPhone: '',
          password: '123456',
        })
        setPhoneCheckResult({ checking: false, exists: false, canAdd: true, error: null, user: null })
        fetchStudents()
        alert(data.message || '学员用户创建成功')
      } else {
        const errorText = await res.text()
        let errorMsg = '创建失败'
        try {
          const errorData = JSON.parse(errorText)
          errorMsg = errorData.error || '创建失败'
        } catch {
          errorMsg = errorText || '创建失败'
        }
        alert(errorMsg)
      }
    } catch (error) {
      console.error('创建学员用户失败:', error)
      alert('创建失败')
    }
  }

  const isAdmin = role === 'admin' || role === 'club_admin' || role === 'super_admin' || role === 'full_time_coach'
  const canManage = role === 'admin' || role === 'club_admin' || role === 'full_time_coach' // 超级管理员只能查看
  const canAddStudent = role === 'admin' || role === 'club_admin' || role === 'coach' || role === 'part_time_coach' || role === 'full_time_coach'
  const canEditOwn = role === 'coach' || role === 'part_time_coach' // 教练可编辑/删除自己的私有学员

  // 按家庭分组显示未成年学员
  const groupedStudents = React.useMemo(() => {
    if (typeFilter !== 'minor') return null

    const families: { [key: string]: { parentName: string; parentPhone: string; students: any[] } } = {}
    const ungrouped: any[] = []

    students.forEach((student) => {
      if (student.parentPhone) {
        const key = student.parentPhone
        if (!families[key]) {
          families[key] = {
            parentName: student.parentName || '未知家长',
            parentPhone: student.parentPhone,
            students: [],
          }
        }
        families[key].students.push(student)
      } else {
        ungrouped.push(student)
      }
    })

    return { families: Object.values(families), ungrouped }
  }, [students, typeFilter])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">
            {(role === 'coach' || role === 'part_time_coach') ? '我的学员' : role === 'super_admin' ? '学员查看' : '学员管理'}
          </h1>
          {canAddStudent && (
            <Button onClick={() => {
              setStudentType('private')  // 默认为俱乐部私有
              setCreateStudentDialogOpen(true)
            }} size="sm">
              <UserPlus className="h-4 w-4 mr-1" />添加
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClubSelector />
          <Button variant="outline" size="sm" onClick={fetchStudents}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            刷新
          </Button>
        </div>
      </div>

      {/* 学员类型筛选 */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <span className="text-xs text-gray-500 shrink-0">类型：</span>
        <div className="flex gap-1">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setTypeFilter('all')}
          >
            全部
          </Button>
          <Button
            variant={typeFilter === 'adult' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setTypeFilter('adult')}
          >
            成年
          </Button>
          <Button
            variant={typeFilter === 'minor' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setTypeFilter('minor')}
          >
            未成年
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <Input
              placeholder="搜索姓名、手机号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无数据</div>
          ) : typeFilter === 'minor' && groupedStudents ? (
            // 未成年学员按家庭分组显示
            <div className="space-y-3">
              <div className="text-xs text-gray-500 px-1">
                共 {students.length} 名学员，{groupedStudents.families.length} 个家庭
              </div>
              {groupedStudents.families.map((family, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">家长：{family.parentName}</span>
                      <span className="text-sm text-gray-500">（{family.parentPhone}）</span>
                      <Badge variant="outline">{family.students.length}名学员</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {family.students.map((student) => (
                      <div key={student.id} className="flex items-center justify-between pl-7 py-2 border-t">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{student.name}</span>
                          <span className="text-sm text-gray-500">
                            {student.gender === 1 ? '男' : student.gender === 2 ? '女' : '-'}
                          </span>
                          {student.birthDate && (
                            <span className="text-sm text-gray-500">
                              {new Date(student.birthDate).getFullYear()}年生
                            </span>
                          )}
                          {student.parentId ? (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                              <User className="h-3 w-3 mr-1" />
                              已关联家长
                            </Badge>
                          ) : student.parentPhone ? (
                            <Badge variant="outline" className="text-xs">有家长信息</Badge>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(student)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {groupedStudents.ungrouped.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">未关联家长的学员</span>
                  </div>
                  <div className="space-y-2">
                    {groupedStudents.ungrouped.map((student) => (
                      <div key={student.id} className="flex items-center justify-between pl-7 py-2 border-t">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{student.name}</span>
                          <span className="text-sm text-gray-500">
                            {student.gender === 1 ? '男' : student.gender === 2 ? '女' : '-'}
                          </span>
                          {student.parentId ? (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                              <User className="h-3 w-3 mr-1" />
                              已关联家长
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(student)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-500 px-1 mb-1">
                共 {students.length} 名学员
              </div>

              {/* 桌面端：表格列表 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 px-2 font-medium">姓名</th>
                      <th className="py-2 px-2 font-medium">性别</th>
                      <th className="py-2 px-2 font-medium">手机号</th>
                      {isAdmin && <th className="py-2 px-2 font-medium">归属</th>}
                      <th className="py-2 px-2 font-medium">状态</th>
                      {(canManage || canEditOwn) && <th className="py-2 px-2 font-medium text-right">操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium">{student.name}</td>
                        <td className="py-2 px-2 text-gray-500">
                          {student.gender === 1 ? '男' : student.gender === 2 ? '女' : '-'}
                        </td>
                        <td className="py-2 px-2 text-gray-500">{student.phone || '-'}</td>
                        {isAdmin && (
                          <td className="py-2 px-2">
                            {!student.clubId ? (
                              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">纯私有</Badge>
                            ) : student.coach ? (
                              <Badge variant="secondary" className="text-xs">
                                <UserCheck className="h-3 w-3 mr-1" />
                                {student.coach.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">共享</Badge>
                            )}
                          </td>
                        )}
                        <td className="py-2 px-2">
                          {student.studentType === 'adult' ? (
                            student.userId ? (
                              <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                <Key className="h-3 w-3 mr-1" />已创建账号
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">未创建账号</Badge>
                            )
                          ) : (
                            student.parentId ? (
                              <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                <User className="h-3 w-3 mr-1" />已关联家长
                              </Badge>
                            ) : student.parentPhone ? (
                              <Badge variant="outline" className="text-xs">有家长信息</Badge>
                            ) : null
                          )}
                        </td>
                        {(canManage || canEditOwn) && (
                          <td className="py-2 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isAdmin && student.clubId && !student.coach && canManage && (
                                <Select onValueChange={(v) => handleAssign(student.id, parseInt(v))}>
                                  <SelectTrigger className="h-7 text-xs border-dashed w-24">
                                    <SelectValue placeholder="分配" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {coaches.map((c) => (
                                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {isAdmin && student.coach && canManage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-gray-500"
                                  onClick={() => handleAssign(student.id, null)}
                                >
                                  <UserX className="h-3 w-3 mr-1" />取消私有
                                </Button>
                              )}
                              {(canManage || (canEditOwn && student.coach?.id === userId)) && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(student)}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(student.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                  {!student.userId && canManage && student.studentType !== 'minor' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setCreateAccountStudent(student)
                                        setAccountPassword('')
                                        setCreateAccountDialogOpen(true)
                                      }}
                                    >
                                      <UserPlus className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 手机端：卡片式 */}
              <div className="sm:hidden grid grid-cols-1 gap-3">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="border rounded-lg p-3 space-y-2 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-base">{student.name}</span>
                        <span className="text-sm text-gray-500">
                          {student.gender === 1 ? '男' : student.gender === 2 ? '女' : ''}
                        </span>
                      </div>
                      {(canManage || (canEditOwn && student.coach?.id === userId)) && (
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(student)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(student.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {!student.userId && canManage && student.studentType !== 'minor' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setCreateAccountStudent(student)
                                setAccountPassword('')
                                setCreateAccountDialogOpen(true)
                              }}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      {student.phone && <div className="text-gray-600">{student.phone}</div>}
                      {student.parentName && (
                        <div className="text-gray-500">家长：{student.parentName} {student.parentPhone}</div>
                      )}
                      {student.birthDate && (
                        <div className="text-gray-500">{new Date(student.birthDate).getFullYear()}年生</div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {student.studentType === 'adult' ? (
                        student.userId ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                            <Key className="h-3 w-3 mr-1" />已创建账号
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">未创建账号</Badge>
                        )
                      ) : (
                        student.parentId ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                            <User className="h-3 w-3 mr-1" />已关联家长
                          </Badge>
                        ) : student.parentPhone ? (
                          <Badge variant="outline" className="text-xs">有家长信息</Badge>
                        ) : null
                      )}
                      {isAdmin && (
                        <>
                          {!student.clubId ? (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              <User className="h-3 w-3 mr-1" />纯私有
                            </Badge>
                          ) : student.coach ? (
                            <Badge variant="secondary" className="text-xs">
                              <UserCheck className="h-3 w-3 mr-1" />{student.coach.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">共享</Badge>
                          )}
                        </>
                      )}
                    </div>
                    {isAdmin && student.clubId && !student.coach && canManage && (
                      <div className="pt-1">
                        <Select onValueChange={(v) => handleAssign(student.id, parseInt(v))}>
                          <SelectTrigger className="h-7 text-xs border-dashed">
                            <SelectValue placeholder="分配教练" />
                          </SelectTrigger>
                          <SelectContent>
                            {coaches.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {isAdmin && student.coach && canManage && (
                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-gray-500"
                          onClick={() => handleAssign(student.id, null)}
                        >
                          <UserX className="h-3 w-3 mr-1" />取消私有
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

      {/* 创建学员用户对话框 */}
      <Dialog open={createStudentDialogOpen} onOpenChange={(open) => {
        setCreateStudentDialogOpen(open)
        if (!open) {
          setPhoneCheckResult({ checking: false, exists: false, canAdd: true, error: null, user: null })
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加学员</DialogTitle>
            <DialogDescription>
              {createStudentType === 'adult' ? '创建学员信息和登录账号' : '创建学员信息，关联家长账号'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 学员类型选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">学员类型</label>
              <div className="flex gap-2">
                <Button
                  variant={createStudentType === 'adult' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setCreateStudentType('adult')}
                >
                  <User className="h-4 w-4 mr-1" />成年学员
                </Button>
                <Button
                  variant={createStudentType === 'minor' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setCreateStudentType('minor')}
                >
                  <Users className="h-4 w-4 mr-1" />未成年学员
                </Button>
              </div>
            </div>

            {/* 兼职教练：学员归属类型选择 */}
            {(role === 'part_time_coach' || role === 'coach') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">学员归属</label>
                <div className="flex gap-2">
                  <Button
                    variant={studentType === 'private' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setStudentType('private')}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />俱乐部私有
                  </Button>
                  <Button
                    variant={studentType === 'solo' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setStudentType('solo')}
                  >
                    <Lock className="h-4 w-4 mr-1" />纯私有
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  俱乐部私有：学员属于当前俱乐部，仅你可见<br />
                  纯私有：学员不关联任何俱乐部，仅你可见
                </p>
              </div>
            )}

            {/* 联系方式 - 根据学员类型显示在最前面 */}
            {createStudentType === 'adult' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">手机号 *</label>
                <Input
                  type="tel"
                  placeholder="请输入学员手机号"
                  value={createStudentForm.phone}
                  onChange={(e) => setCreateStudentForm({ ...createStudentForm, phone: e.target.value })}
                  autoComplete="off"
                />
                {phoneCheckResult.checking && (
                  <p className="text-xs text-gray-500">检查中...</p>
                )}
                {!phoneCheckResult.checking && phoneCheckResult.exists && phoneCheckResult.canAdd && (
                  <p className="text-xs text-green-600">该用户已是系统学员，将自动关联</p>
                )}
                {!phoneCheckResult.checking && !phoneCheckResult.canAdd && phoneCheckResult.error && (
                  <p className="text-xs text-red-500">{phoneCheckResult.error}</p>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">家长手机号 *</label>
                  <Input
                    type="tel"
                    placeholder="请输入家长手机号"
                    value={createStudentForm.parentPhone}
                    onChange={(e) => setCreateStudentForm({ ...createStudentForm, parentPhone: e.target.value })}
                    autoComplete="off"
                  />
                  {phoneCheckResult.checking && (
                    <p className="text-xs text-gray-500">检查中...</p>
                  )}
                  {!phoneCheckResult.checking && phoneCheckResult.exists && phoneCheckResult.canAdd && (
                    <p className="text-xs text-green-600">该手机号已有账号，将自动关联家长</p>
                  )}
                  {!phoneCheckResult.checking && !phoneCheckResult.canAdd && phoneCheckResult.error && (
                    <p className="text-xs text-red-500">{phoneCheckResult.error}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">家长姓名</label>
                  <Input
                    placeholder="请输入家长姓名"
                    value={createStudentForm.parentName}
                    onChange={(e) => setCreateStudentForm({ ...createStudentForm, parentName: e.target.value })}
                    disabled={phoneCheckResult.exists && phoneCheckResult.canAdd}
                    className={phoneCheckResult.exists && phoneCheckResult.canAdd ? 'bg-gray-100' : ''}
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">姓名 *</label>
                <Input
                  placeholder="请输入姓名"
                  value={createStudentForm.name}
                  onChange={(e) => setCreateStudentForm({ ...createStudentForm, name: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">性别</label>
                <Select value={createStudentForm.gender} onValueChange={(v) => setCreateStudentForm({ ...createStudentForm, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">男</SelectItem>
                    <SelectItem value="2">女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">出生日期</label>
              <Input
                type="date"
                value={createStudentForm.birthDate}
                onChange={(e) => setCreateStudentForm({ ...createStudentForm, birthDate: e.target.value })}
                autoComplete="off"
              />
            </div>

            {/* 登录密码 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">登录密码</label>
              {createStudentType === 'adult' ? (
                <>
                  <Input
                    type="password"
                    placeholder={phoneCheckResult.exists && phoneCheckResult.canAdd ? '已有用户，无需设置密码' : '请输入登录密码'}
                    value={createStudentForm.password}
                    onChange={(e) => setCreateStudentForm({ ...createStudentForm, password: e.target.value })}
                    disabled={phoneCheckResult.exists && phoneCheckResult.canAdd}
                    className={phoneCheckResult.exists && phoneCheckResult.canAdd ? 'bg-gray-100' : ''}
                    autoComplete="new-password"
                  />
                  {phoneCheckResult.exists && phoneCheckResult.canAdd ? (
                    <p className="text-xs text-green-600">该手机号已有用户，将自动关联，无需设置密码</p>
                  ) : (
                    <p className="text-xs text-gray-500">默认密码: 123456</p>
                  )}
                </>
              ) : (
                <>
                  <Input
                    type="password"
                    placeholder={phoneCheckResult.exists && phoneCheckResult.canAdd ? '已有家长账号，无需设置密码' : '请输入家长登录密码'}
                    value={createStudentForm.password}
                    onChange={(e) => setCreateStudentForm({ ...createStudentForm, password: e.target.value })}
                    disabled={phoneCheckResult.exists && phoneCheckResult.canAdd}
                    className={phoneCheckResult.exists && phoneCheckResult.canAdd ? 'bg-gray-100' : ''}
                    autoComplete="new-password"
                  />
                  {phoneCheckResult.exists && phoneCheckResult.canAdd ? (
                    <p className="text-xs text-green-600">家长已有账号，将自动关联，无需设置密码</p>
                  ) : (
                    <p className="text-xs text-gray-500">默认密码: 123456</p>
                  )}
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateStudentDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleCreateStudentUser}
              disabled={(!phoneCheckResult.canAdd || phoneCheckResult.checking)}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建账号对话框 */}
      <Dialog open={createAccountDialogOpen} onOpenChange={setCreateAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建学员登录账号</DialogTitle>
            <DialogDescription>
              为学员 {createAccountStudent?.name} 创建登录账号
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">登录手机号</label>
              <Input
                type="tel"
                value={createAccountStudent?.phone || createAccountStudent?.parentPhone || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                {createAccountStudent?.studentType === 'minor' ? '未成年学员使用家长手机号登录' : '使用学员手机号登录'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">初始密码</label>
              <Input
                type="password"
                placeholder="请设置初始密码（至少6位）"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAccountDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreateAccount} disabled={accountLoading || accountPassword.length < 6}>
              {accountLoading ? '创建中...' : '创建账号'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑学员对话框 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) setEditId(null)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑学员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">姓名 *</label>
                <Input
                  placeholder="请输入姓名"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">性别</label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">男</SelectItem>
                    <SelectItem value="2">女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">手机号</label>
              <Input
                type="tel"
                placeholder="请输入手机号"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            {editStudentType === 'minor' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">家长姓名</label>
                  <Input
                    placeholder="请输入家长姓名"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">家长手机号</label>
                  <Input
                    type="tel"
                    placeholder="请输入家长手机号"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditId(null) }}>取消</Button>
            <Button onClick={handleSubmit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
