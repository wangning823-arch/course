'use client'

import * as React from 'react'
import { Plus, Edit, Trash2, Search, RefreshCw, UserCheck, UserX, Users, Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ClubSelector } from '@/components/club-selector'
import { authFetch } from '@/lib/fetch-client'
import { useDebounce } from '@/hooks/use-debounce'

interface Coach { id: number; name: string }
interface Club { id: number; name: string }

export default function StudentsPage() {
  const [students, setStudents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ name: '', phone: '', gender: '1', parentName: '', parentPhone: '' })
  const [editId, setEditId] = React.useState<number | null>(null)
  const [role, setRole] = React.useState<string>('')
  const [userId, setUserId] = React.useState<number | null>(null)
  const [coaches, setCoaches] = React.useState<Coach[]>([])
  const [coachClubs, setCoachClubs] = React.useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = React.useState<string>('')
  const [studentType, setStudentType] = React.useState<'shared' | 'private' | 'solo'>('private')

  React.useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      setRole(user.role || '')
      setUserId(user.id || null)
    }
  }, [])

  const fetchStudents = React.useCallback(async () => {
    setLoading(true)
    try {
      const stored = localStorage.getItem('user')
      const user = stored ? JSON.parse(stored) : null
      const clubId = localStorage.getItem('currentClubId') || user?.clubId

      let url = `/api/students?search=${debouncedSearch}`
      // 教练：默认看所有俱乐部学员，选择具体俱乐部时按俱乐部过滤
      if ((user?.role === 'coach' || user?.role === 'part_time_coach') && user?.id) {
        url += `&coachId=${user.id}`
        if (clubId && clubId !== 'all') {
          url += `&clubId=${clubId}`
        }
      } else {
        // 管理员/全职教练：按俱乐部过滤
        if (clubId && clubId !== 'all') {
          url += `&clubId=${clubId}`
        }
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
  }, [debouncedSearch])

  // 加载教练列表（管理员用）
  const fetchCoaches = React.useCallback(async () => {
    if (role !== 'admin' && role !== 'club_admin' && role !== 'super_admin' && role !== 'full_time_coach') return
    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : null
    const clubId = localStorage.getItem('currentClubId') || user?.clubId
    if (!clubId) return
    try {
      const res = await authFetch(`/api/users?role=coach,part_time_coach,full_time_coach&clubId=${clubId}`)
      if (!res.ok) return
      const data = await res.json()
      setCoaches(data)
    } catch (e) {
      console.error('加载教练失败:', e)
    }
  }, [role])

  // 加载教练所属俱乐部列表
  const fetchCoachClubs = React.useCallback(async () => {
    if (role !== 'coach' && role !== 'part_time_coach') return
    try {
      const res = await authFetch('/api/auth/me/clubs')
      if (!res.ok) return
      const data = await res.json()
      setCoachClubs(data)
      // 默认选中 currentClubId 或第一个俱乐部
      const clubId = localStorage.getItem('currentClubId')
      if (clubId && data.some((c: Club) => c.id === parseInt(clubId))) {
        setSelectedClubId(clubId)
      } else if (data.length > 0) {
        setSelectedClubId(String(data[0].id))
      }
    } catch (e) {
      console.error('加载俱乐部失败:', e)
    }
  }, [role])

  React.useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  React.useEffect(() => {
    fetchCoaches()
    fetchCoachClubs()
  }, [fetchCoaches, fetchCoachClubs])

  // 监听俱乐部切换
  React.useEffect(() => {
    const handleClubChanged = () => {
      fetchStudents()
      fetchCoaches()
    }
    window.addEventListener('clubChanged', handleClubChanged)
    return () => window.removeEventListener('clubChanged', handleClubChanged)
  }, [fetchStudents, fetchCoaches])

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
        const clubId = localStorage.getItem('currentClubId')
        submitData.clubId = clubId ? parseInt(clubId) : null
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
      await authFetch(`/api/students/${id}`, { method: 'DELETE' })
      fetchStudents()
    } catch (error) {
      console.error('删除失败:', error)
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
    // 判断学员类型
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

  const isAdmin = role === 'admin' || role === 'club_admin' || role === 'super_admin' || role === 'full_time_coach'
  const canManage = role === 'admin' || role === 'club_admin' || role === 'full_time_coach' // 超级管理员只能查看
  const canAddStudent = role === 'admin' || role === 'club_admin' || role === 'coach' || role === 'part_time_coach' || role === 'full_time_coach'
  const canEditOwn = role === 'coach' || role === 'part_time_coach' // 教练可编辑/删除自己的私有学员

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          {(role === 'coach' || role === 'part_time_coach') ? '我的学员' : role === 'super_admin' ? '学员查看' : '学员管理'}
        </h1>
        <div className="flex items-center gap-2">
          <ClubSelector />
          <Button variant="outline" onClick={fetchStudents}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          {canAddStudent && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setFormData({ name: '', phone: '', gender: '1', parentName: '', parentPhone: '' }); setEditId(null); setStudentType('private') }}>
                  <Plus className="h-4 w-4 mr-1" />添加学员
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? '编辑学员' : '添加学员'}</DialogTitle>
                <DialogDescription>
                  {(String(role) === 'coach' || String(role) === 'part_time_coach') ? '选择学员归属并填写信息' : '填写学员信息'}
                </DialogDescription>
              </DialogHeader>
              {(role === 'coach' || role === 'part_time_coach') && !editId && (
                <div className="flex gap-2">
                  <Button
                    variant={studentType === 'private' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setStudentType('private')}
                  >
                    <Lock className="h-4 w-4 mr-1" />俱乐部私有
                  </Button>
                  <Button
                    variant={studentType === 'shared' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setStudentType('shared')}
                  >
                    <Users className="h-4 w-4 mr-1" />俱乐部共享
                  </Button>
                  <Button
                    variant={studentType === 'solo' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setStudentType('solo')}
                  >
                    <User className="h-4 w-4 mr-1" />纯私有
                  </Button>
                </div>
              )}
              {(role === 'coach' || role === 'part_time_coach') && !editId && studentType !== 'solo' && coachClubs.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">所属俱乐部</label>
                  <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                    <SelectTrigger><SelectValue placeholder="选择俱乐部" /></SelectTrigger>
                    <SelectContent>
                      {coachClubs.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">姓名</label>
                    <Input placeholder="请输入姓名" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
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
                  <Input type="tel" placeholder="请输入手机号" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">家长姓名</label>
                    <Input placeholder="请输入家长姓名" value={formData.parentName} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">家长手机号</label>
                    <Input type="tel" placeholder="请输入家长手机号" value={formData.parentPhone} onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button onClick={handleSubmit}>确定</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索姓名、手机号、家长..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无数据</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>性别</TableHead>
                    <TableHead>手机号</TableHead>
                    <TableHead className="hidden sm:table-cell">家长姓名</TableHead>
                    <TableHead className="hidden sm:table-cell">家长手机</TableHead>
                    {isAdmin && <TableHead>归属</TableHead>}
                    {(canManage || canEditOwn) && <TableHead>操作</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.gender === 1 ? '男' : student.gender === 2 ? '女' : '-'}</TableCell>
                      <TableCell>{student.phone || '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell">{student.parentName || '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell">{student.parentPhone || '-'}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          {!student.clubId ? (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              <User className="h-3 w-3 mr-1" />
                              纯私有
                            </Badge>
                          ) : student.coach ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                <UserCheck className="h-3 w-3 mr-1" />
                                {student.coach.name}
                              </Badge>
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1 text-xs"
                                  onClick={() => handleAssign(student.id, null)}
                                  title="设为共享"
                                >
                                  <UserX className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">共享</Badge>
                              {canManage && (
                                <Select
                                  onValueChange={(v) => handleAssign(student.id, parseInt(v))}
                                >
                                  <SelectTrigger className="h-6 w-auto px-2 text-xs border-dashed">
                                    <SelectValue placeholder="分配教练" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {coaches.map((c) => (
                                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                      {(canManage || (canEditOwn && student.coach?.id === userId)) && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(student)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(student.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
