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

const roleLabels: Record<string, string> = {
  super_admin: '系统管理员',
  club_admin: '俱乐部管理员',
  coach: '教练',
}

const roleColors: Record<string, 'default' | 'success' | 'warning'> = {
  super_admin: 'default',
  club_admin: 'success',
  coach: 'warning',
}

interface Club { id: number; name: string }

export default function UsersPage() {
  const [users, setUsers] = React.useState<any[]>([])
  const [clubs, setClubs] = React.useState<Club[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ name: '', phone: '', role: 'coach', password: '', clubId: '' })
  const [editId, setEditId] = React.useState<number | null>(null)
  const [currentUser, setCurrentUser] = React.useState<any>(null)
  const [createdPassword, setCreatedPassword] = React.useState('')
  const [filterClubId, setFilterClubId] = React.useState<string>('all')

  React.useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      setCurrentUser(JSON.parse(stored))
    }
  }, [])

  const availableRoles = React.useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'super_admin') {
      return [{ value: 'club_admin', label: '俱乐部管理员' }]
    }
    if (currentUser.role === 'club_admin') {
      return [{ value: 'coach', label: '教练' }]
    }
    return []
  }, [currentUser])

  // 是否需要选择俱乐部（创建俱乐部管理员或教练时需要）
  const needClubSelect = React.useMemo(() => {
    return currentUser?.role === 'super_admin' || currentUser?.role === 'club_admin'
  }, [currentUser])

  const fetchUsers = async (clubId?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (clubId) params.set('clubId', clubId)
      const url = params.toString() ? `/api/users?${params}` : '/api/users'
      const res = await fetch(url)
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error('获取用户失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClubs = async () => {
    try {
      const res = await fetch('/api/clubs')
      const data = await res.json()
      setClubs(data)
    } catch (error) {
      console.error('获取俱乐部失败:', error)
    }
  }

  React.useEffect(() => {
    fetchUsers()
    fetchClubs()
  }, [])

  // 俱乐部筛选变化时重新获取用户
  React.useEffect(() => {
    fetchUsers(filterClubId === 'all' ? '' : filterClubId)
  }, [filterClubId])

  const handleSubmit = async () => {
    try {
      if (editId) {
        await fetch(`/api/users/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        const res = await fetch('/api/users', {
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
        if (data.defaultPassword) {
          setCreatedPassword(data.defaultPassword)
        }
      }
      setDialogOpen(false)
      setFormData({ name: '', phone: '', role: availableRoles[0]?.value || 'coach', password: '', clubId: '' })
      setEditId(null)
      fetchUsers(filterClubId === 'all' ? '' : filterClubId)
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该用户吗？')) return
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' })
      fetchUsers(filterClubId === 'all' ? '' : filterClubId)
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleEdit = (user: any) => {
    setFormData({
      name: user.name, phone: user.phone, role: user.role,
      password: '', clubId: '',
    })
    setEditId(user.id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" onClick={() => fetchUsers(filterClubId === 'all' ? '' : filterClubId)}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          {availableRoles.length > 0 && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setFormData({ name: '', phone: '', role: availableRoles[0]?.value || 'coach', password: '', clubId: '' }); setEditId(null); setCreatedPassword('') }}>
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
                    <label className="text-sm font-medium">姓名</label>
                    <Input placeholder="请输入姓名" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">手机号</label>
                    <Input type="tel" placeholder="请输入手机号" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">角色</label>
                    {editId ? (
                      <Input value={roleLabels[formData.role] || formData.role} disabled className="bg-gray-50" />
                    ) : (
                      <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {needClubSelect && !editId && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">所属俱乐部 *</label>
                      <Select value={formData.clubId} onValueChange={(v) => setFormData({ ...formData, clubId: v })}>
                        <SelectTrigger><SelectValue placeholder="请选择俱乐部" /></SelectTrigger>
                        <SelectContent>
                          {clubs.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">密码 {editId ? '（留空不修改）' : ''}</label>
                    <Input
                      type="password"
                      placeholder={editId ? '留空不修改' : '默认 123456'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
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

      {createdPassword && (
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 text-sm text-green-700">
          用户创建成功！默认密码：<span className="font-mono font-bold">{createdPassword}</span>
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setCreatedPassword('')}>关闭</Button>
        </div>
      )}

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
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
