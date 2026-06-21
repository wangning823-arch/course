'use client'

import * as React from 'react'
import { Plus, Edit, Trash2, Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function StudentsPage() {
  const [students, setStudents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ name: '', phone: '', gender: '1', parentName: '', parentPhone: '' })
  const [editId, setEditId] = React.useState<number | null>(null)

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/students?search=${search}`)
      const data = await res.json()
      setStudents(data)
    } catch (error) {
      console.error('获取学员失败:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchStudents()
  }, [search])

  const handleSubmit = async () => {
    try {
      const submitData = { ...formData, gender: parseInt(formData.gender) }
      if (editId) {
        await fetch(`/api/students/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        })
      } else {
        await fetch('/api/students', {
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
      await fetch(`/api/students/${id}`, { method: 'DELETE' })
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
    setEditId(student.id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">学员管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchStudents}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setFormData({ name: '', phone: '', gender: '1', parentName: '', parentPhone: '' }); setEditId(null) }}>
                <Plus className="h-4 w-4 mr-1" />添加学员
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? '编辑学员' : '添加学员'}</DialogTitle>
                <DialogDescription>填写学员信息</DialogDescription>
              </DialogHeader>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>性别</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead className="hidden sm:table-cell">家长姓名</TableHead>
                  <TableHead className="hidden sm:table-cell">家长手机</TableHead>
                  <TableHead>操作</TableHead>
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
