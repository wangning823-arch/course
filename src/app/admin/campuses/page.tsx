'use client'

import * as React from 'react'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function CampusesPage() {
  const [campuses, setCampuses] = React.useState<any[]>([])
  const [clubs, setClubs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ clubId: '', name: '', address: '', phone: '' })
  const [editId, setEditId] = React.useState<number | null>(null)

  const fetchCampuses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/campuses')
      const data = await res.json()
      setCampuses(data)
    } catch (error) {
      console.error('获取校区失败:', error)
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
    fetchCampuses()
    fetchClubs()
  }, [])

  const handleSubmit = async () => {
    try {
      if (editId) {
        await fetch(`/api/campuses/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/campuses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setDialogOpen(false)
      setFormData({ clubId: '', name: '', address: '', phone: '' })
      setEditId(null)
      fetchCampuses()
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该校区吗？')) return
    try {
      await fetch(`/api/campuses/${id}`, { method: 'DELETE' })
      fetchCampuses()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleEdit = (campus: any) => {
    setFormData({ clubId: '', name: campus.name, address: campus.address || '', phone: campus.phone || '' })
    setEditId(campus.id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">校区管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCampuses}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setFormData({ clubId: '', name: '', address: '', phone: '' }); setEditId(null) }}>
                <Plus className="h-4 w-4 mr-1" />添加校区
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? '编辑校区' : '添加校区'}</DialogTitle>
                <DialogDescription>填写校区信息</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">所属俱乐部</label>
                  <Select value={formData.clubId} onValueChange={(v) => setFormData({ ...formData, clubId: v })}>
                    <SelectTrigger><SelectValue placeholder="选择俱乐部" /></SelectTrigger>
                    <SelectContent>
                      {clubs.map((club) => (
                        <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">校区名称</label>
                  <Input placeholder="请输入校区名称" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">地址</label>
                  <Input placeholder="请输入地址" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">联系电话</label>
                  <Input placeholder="请输入联系电话" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
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
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : campuses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>校区名称</TableHead>
                  <TableHead>所属俱乐部</TableHead>
                  <TableHead className="hidden sm:table-cell">地址</TableHead>
                  <TableHead>课程数</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campuses.map((campus) => (
                  <TableRow key={campus.id}>
                    <TableCell className="font-medium">{campus.name}</TableCell>
                    <TableCell>{campus.club}</TableCell>
                    <TableCell className="hidden sm:table-cell">{campus.address}</TableCell>
                    <TableCell>{campus.courses}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(campus)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(campus.id)}>
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
