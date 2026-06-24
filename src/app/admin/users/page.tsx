'use client'

import * as React from 'react'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authFetch } from '@/lib/fetch-client'
import { User, UserWithClubs, Club, UserRole } from '@/types/api'
import { useUserStore } from '@/stores/user-store'
import { useClubStore } from '@/stores/club-store'

const roleLabels: Record<UserRole, string> = {
  super_admin: '系统管理员',
  club_admin: '俱乐部管理员',
  full_time_coach: '全职教练',
  part_time_coach: '兼职教练',
}

const roleColors: Record<UserRole, 'default' | 'success' | 'warning' | 'secondary'> = {
  super_admin: 'default',
  club_admin: 'success',
  full_time_coach: 'secondary',
  part_time_coach: 'warning',
}

export default function UsersPage() {
  const storeUser = useUserStore((s) => s.user)
  const currentClubId = useClubStore((s) => s.currentClubId)
  const [users, setUsers] = React.useState<UserWithClubs[]>([])
  const [clubs, setClubs] = React.useState<Club[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ name: '', phone: '', role: 'part_time_coach' as UserRole, password: '', clubId: '' })
  const [editId, setEditId] = React.useState<number | null>(null)
  const [filterClubId, setFilterClubId] = React.useState<string>('all')
  const [phoneExists, setPhoneExists] = React.useState(false)
  const [existingUserRole, setExistingUserRole] = React.useState('')

  // 将 storeUser 转换为 User 类型（包含 clubId）
  const currentUser = React.useMemo(() => {
    if (!storeUser) return null
    return {
      ...storeUser,
      status: 1,
      createdAt: '',
    } as User & { clubId?: number | null }
  }, [storeUser])

  React.useEffect(() => {
    if (storeUser?.role === 'club_admin' && storeUser.clubId) {
      setFilterClubId(String(storeUser.clubId))
    }
  }, [storeUser])

  const availableRoles = React.useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'super_admin') {
      return [{ value: 'club_admin', label: '俱乐部管理员' }]
    }
    if (currentUser.role === 'club_admin') {
      return [
        { value: 'full_time_coach', label: '全职教练' },
        { value: 'part_time_coach', label: '兼职教练' },
      ]
    }
    return []
  }, [currentUser])

  // 是否需要选择俱乐部（创建俱乐部管理员或教练时需要）
  const needClubSelect = React.useMemo(() => {
    return currentUser?.role === 'super_admin' || currentUser?.role === 'club_admin'
  }, [currentUser])

  // 俱乐部管理员只能在自己的俱乐部创建用户
  const isClubAdminLocked = React.useMemo(() => {
    return currentUser?.role === 'club_admin'
  }, [currentUser])

  const [existingUserName, setExistingUserName] = React.useState('')

  // 检查手机号是否已存在
  const checkPhone = async (phone: string) => {
    if (!phone || editId) {
      setPhoneExists(false)
      setExistingUserName('')
      setExistingUserRole('')
      return
    }
    try {
      const res = await authFetch(`/api/users?phoneCheck=1&search=${encodeURIComponent(phone)}`)
      const data = await res.json()
      const existing = data.find((u: any) => u.phone === phone)
      if (existing) {
        setPhoneExists(true)
        setExistingUserName(existing.name)
        setExistingUserRole(existing.role)
        // 兼职教练关联时，锁定角色为兼职教练
        if (currentUser?.role === 'club_admin' && existing.role === 'part_time_coach') {
          setFormData(prev => ({ ...prev, name: existing.name, role: 'part_time_coach' as UserRole }))
        } else {
          setFormData(prev => ({ ...prev, name: existing.name }))
        }
      } else {
        setPhoneExists(false)
        setExistingUserName('')
        setExistingUserRole('')
      }
    } catch {
      setPhoneExists(false)
      setExistingUserName('')
      setExistingUserRole('')
    }
  }

  const fetchUsers = React.useCallback(async (clubId?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (storeUser?.role === 'club_admin' && storeUser?.clubId) {
        // 俱乐部管理员：强制用自己的 clubId，忽略传入参数
        params.set('clubId', String(storeUser.clubId))
      } else if (clubId && clubId !== 'all') {
        params.set('clubId', clubId)
      }
      const url = params.toString() ? `/api/users?${params}` : '/api/users'
      const res = await authFetch(url)
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error('获取用户失败:', error)
    } finally {
      setLoading(false)
    }
  }, [storeUser])

  const fetchClubs = async () => {
    try {
      const res = await authFetch('/api/clubs')
      const data = await res.json()
      setClubs(data)
    } catch (error) {
      console.error('获取俱乐部失败:', error)
    }
  }

  // 初始化加载
  React.useEffect(() => {
    fetchUsers()
    fetchClubs()
  }, [])

  // 俱乐部筛选变化时重新获取用户（super_admin 专用）
  React.useEffect(() => {
    if (filterClubId !== 'all') {
      fetchUsers(filterClubId)
    }
  }, [filterClubId])

  const handleSubmit = async () => {
    try {
      if (editId) {
        await authFetch(`/api/users/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        const res = await authFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            createdByRole: currentUser?.role,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '创建失败')
          return
        }
        if (data.message) {
          // 已关联到俱乐部，显示提示
          alert(data.message)
        } else {
          // 创建成功提示
          alert('用户创建成功')
        }
      }
      setDialogOpen(false)
      setFormData({ name: '', phone: '', role: (availableRoles[0]?.value || 'part_time_coach') as UserRole, password: '', clubId: '' })
      setEditId(null)
      fetchUsers(filterClubId === 'all' ? '' : filterClubId)
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要从当前俱乐部移除该用户吗？')) return
    try {
      const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '删除失败')
        return
      }
      if (data.message) {
        alert(data.message)
      }
      fetchUsers(filterClubId === 'all' ? '' : filterClubId)
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败，请重试')
    }
  }

  const handleEdit = (user: any) => {
    setFormData({
      name: user.name, phone: user.phone, role: user.role,
      password: '', clubId: '',
    })
    setEditId(user.id)
    setEditingUser(user)
    setDialogOpen(true)
  }

  const [editingUser, setEditingUser] = React.useState<any>(null)

  // 是否禁止提交（俱乐部管理员添加时，手机号属于不可添加的角色）
  const isBlocked = React.useMemo(() => {
    return phoneExists && currentUser?.role === 'club_admin' && existingUserRole !== 'part_time_coach'
  }, [phoneExists, currentUser, existingUserRole])

  // 检查是否可以更改角色
  const canChangeRole = React.useMemo(() => {
    if (!editingUser || !currentUser) return false
    // 只有教练角色可以更改
    if (editingUser.role !== 'full_time_coach' && editingUser.role !== 'part_time_coach') return false
    // 系统管理员和俱乐部管理员可以更改
    return currentUser.role === 'super_admin' || currentUser.role === 'club_admin'
  }, [editingUser, currentUser])

  // 检查是否可以改为全职教练
  const canChangeToFullTime = React.useMemo(() => {
    if (!editingUser) return false
    // 如果已经是全职教练，可以改为兼职
    if (editingUser.role === 'full_time_coach') return true
    // 兼职教练改全职需要检查俱乐部数量
    // editingUser.clubCount 在获取用户列表时传入
    return editingUser.clubCount <= 1
  }, [editingUser])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <div className="flex items-center gap-2">
          {currentUser?.role === 'super_admin' && (
            <Select value={filterClubId} onValueChange={setFilterClubId}>
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="全部俱乐部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部俱乐部</SelectItem>
                {clubs.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={() => fetchUsers(filterClubId === 'all' ? '' : filterClubId)}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          {availableRoles.length > 0 && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setPhoneExists(false); setExistingUserName(''); setExistingUserRole(''); setEditingUser(null) } }}>
              <DialogTrigger asChild>
                <Button onClick={() => { setFormData({ name: '', phone: '', role: (availableRoles[0]?.value || 'part_time_coach') as UserRole, password: '', clubId: isClubAdminLocked ? String(currentUser?.clubId || '') : '' }); setEditId(null) }}>
                  <Plus className="h-4 w-4 mr-1" />添加用户
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editId ? '编辑用户' : '添加用户'}</DialogTitle>
                  <DialogDescription>
                    {editId ? '修改用户信息' : `默认密码：123456（可自定义）`}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">手机号</label>
                    <Input type="tel" placeholder="请输入手机号" value={formData.phone} onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); checkPhone(e.target.value) }} />
                    {phoneExists && currentUser?.role === 'club_admin' && existingUserRole === 'part_time_coach' && (
                      <p className="text-sm text-blue-600">该手机号已是兼职教练（{existingUserName}），将直接关联到当前俱乐部</p>
                    )}
                    {phoneExists && currentUser?.role === 'club_admin' && existingUserRole !== 'part_time_coach' && (
                      <p className="text-sm text-red-500">
                        该手机号已是{existingUserRole === 'full_time_coach' ? '全职教练' : existingUserRole === 'club_admin' ? '俱乐部管理员' : existingUserRole === 'super_admin' ? '系统管理员' : existingUserRole === 'parent' ? '家长' : existingUserRole === 'student' ? '学员' : '其他用户'}（{existingUserName}），不能添加为教练
                      </p>
                    )}
                    {phoneExists && currentUser?.role === 'super_admin' && (
                      <p className="text-sm text-blue-600">该手机号已存在，将直接关联到当前俱乐部</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">姓名</label>
                    {phoneExists ? (
                      <Input value={existingUserName} disabled className="bg-gray-50" />
                    ) : (
                      <Input placeholder="请输入姓名" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">角色</label>
                    {editId ? (
                      canChangeRole && canChangeToFullTime ? (
                        <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time_coach">全职教练</SelectItem>
                            <SelectItem value="part_time_coach">兼职教练</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={roleLabels[formData.role] || formData.role} disabled className="bg-gray-50" />
                      )
                    ) : phoneExists && currentUser?.role === 'club_admin' && existingUserRole === 'part_time_coach' ? (
                      <Input value="兼职教练" disabled className="bg-gray-50" />
                    ) : phoneExists && currentUser?.role === 'club_admin' && existingUserRole !== 'part_time_coach' ? (
                      <Input value={roleLabels[existingUserRole as UserRole] || existingUserRole} disabled className="bg-gray-50" />
                    ) : (
                      <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {editId && canChangeRole && !canChangeToFullTime && (
                      <p className="text-xs text-amber-600">该教练已关联多家俱乐部，无法修改角色</p>
                    )}
                  </div>
                  {needClubSelect && !editId && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">所属俱乐部 *</label>
                      {isClubAdminLocked ? (
                        <Input value={clubs.find(c => c.id === currentUser?.clubId)?.name || ''} disabled className="bg-gray-50" />
                      ) : (
                        <Select value={formData.clubId} onValueChange={(v) => setFormData({ ...formData, clubId: v })}>
                          <SelectTrigger><SelectValue placeholder="请选择俱乐部" /></SelectTrigger>
                          <SelectContent>
                            {clubs.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">密码 {editId ? '（留空不修改）' : ''}</label>
                    <Input
                      type="password"
                      placeholder={editId ? '留空不修改' : '默认 123456'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={phoneExists}
                    />
                    {phoneExists && <p className="text-xs text-gray-500">已有用户，无需填写</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                  <Button onClick={handleSubmit} disabled={isBlocked}>确定</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead className="hidden sm:table-cell">所属俱乐部</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>
                      <Badge variant={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{user.clubs}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.id !== currentUser?.id && (
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(user.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
