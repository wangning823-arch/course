'use client'

import * as React from 'react'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export default function ClubsPage() {
  const [clubs, setClubs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ name: '', address: '', phone: '', description: '' })
  const [editId, setEditId] = React.useState<number | null>(null)

  const fetchClubs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clubs')
      const data = await res.json()
      setClubs(data)
    } catch (error) {
      console.error('获取俱乐部失败:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchClubs()
  }, [])

  const handleSubmit = async () => {
    try {
      if (editId) {
        await fetch(`/api/clubs/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/clubs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setDialogOpen(false)
      setFormData({ name: '', address: '', phone: '', description: '' })
      setEditId(null)
      fetchClubs()
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该俱乐部吗？')) return
    try {
      await fetch(`/api/clubs/${id}`, { method: 'DELETE' })
      fetchClubs()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleEdit = (club: any) => {
    setFormData({ name: club.name, address: club.address || '', phone: club.phone || '', description: club.description || '' })
    setEditId(club.id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">俱乐部管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchClubs}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setFormData({ name: '', address: '', phone: '', description: '' }); setEditId(null) }}>
                <Plus className="h-4 w-4 mr-1" />添加俱乐部
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? '编辑俱乐部' : '添加俱乐部'}</DialogTitle>
                <DialogDescription>填写俱乐部信息</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">俱乐部名称</label>
                  <Input placeholder="请输入俱乐部名称" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">地址</label>
                  <Input placeholder="请输入地址" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">联系电话</label>
                  <Input placeholder="请输入联系电话" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">描述</label>
                  <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[80px]" placeholder="请输入俱乐部描述" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
          ) : clubs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>俱乐部名称</TableHead>
                  <TableHead>管理员</TableHead>
                  <TableHead className="hidden sm:table-cell">校区数</TableHead>
                  <TableHead className="hidden sm:table-cell">教练数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell className="font-medium">{club.name}</TableCell>
                    <TableCell>{club.admin}</TableCell>
                    <TableCell className="hidden sm:table-cell">{club.campuses}</TableCell>
                    <TableCell className="hidden sm:table-cell">{club.coaches}</TableCell>
                    <TableCell><Badge variant="success">运营中</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(club)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(club.id)}>
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
