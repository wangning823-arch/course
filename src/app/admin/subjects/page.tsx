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

export default function SubjectsPage() {
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [clubs, setClubs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({
    clubId: '', name: '', category: '球类', teachingMode: 'private',
    durationMinutes: '60', price: '',
  })
  const [editId, setEditId] = React.useState<number | null>(null)

  const fetchSubjects = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/subjects')
      const data = await res.json()
      setSubjects(data)
    } catch (error) {
      console.error('获取科目失败:', error)
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
    fetchSubjects()
    fetchClubs()
  }, [])

  const handleSubmit = async () => {
    try {
      if (editId) {
        await fetch(`/api/subjects/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setDialogOpen(false)
      setFormData({ clubId: '', name: '', category: '球类', teachingMode: 'private', durationMinutes: '60', price: '' })
      setEditId(null)
      fetchSubjects()
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该科目吗？')) return
    try {
      await fetch(`/api/subjects/${id}`, { method: 'DELETE' })
      fetchSubjects()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleEdit = (subject: any) => {
    setFormData({
      clubId: '',
      name: subject.name,
      category: subject.category || '球类',
      teachingMode: subject.teachingMode,
      durationMinutes: String(subject.durationMinutes || 60),
      price: String(subject.price),
    })
    setEditId(subject.id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">科目管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSubjects}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setFormData({ clubId: '', name: '', category: '球类', teachingMode: 'private', durationMinutes: '60', price: '' }); setEditId(null) }}>
                <Plus className="h-4 w-4 mr-1" />添加科目
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? '编辑科目' : '添加科目'}</DialogTitle>
                <DialogDescription>填写科目信息</DialogDescription>
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
                  <label className="text-sm font-medium">科目名称</label>
                  <Input placeholder="请输入科目名称" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">分类</label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="球类">球类</SelectItem>
                        <SelectItem value="水上">水上</SelectItem>
                        <SelectItem value="武术">武术</SelectItem>
                        <SelectItem value="舞蹈">舞蹈</SelectItem>
                        <SelectItem value="文化课">文化课</SelectItem>
                        <SelectItem value="艺术">艺术</SelectItem>
                        <SelectItem value="乐器">乐器</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">授课模式</label>
                    <Select value={formData.teachingMode} onValueChange={(v) => setFormData({ ...formData, teachingMode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">一对一</SelectItem>
                        <SelectItem value="duo">一对二</SelectItem>
                        <SelectItem value="group">一对多</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">默认时长(分钟)</label>
                    <Input type="number" placeholder="60" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">课时单价(元)</label>
                    <Input type="number" placeholder="100" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
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
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : subjects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>科目名称</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>授课模式</TableHead>
                  <TableHead className="hidden sm:table-cell">默认时长</TableHead>
                  <TableHead>课时单价</TableHead>
                  <TableHead className="hidden sm:table-cell">所属俱乐部</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>{subject.category}</TableCell>
                    <TableCell>
                      <Badge variant={subject.teachingMode === 'private' ? 'default' : subject.teachingMode === 'duo' ? 'secondary' : 'outline'}>
                        {subject.teachingMode === 'private' ? '一对一' : subject.teachingMode === 'duo' ? '一对二' : '一对多'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{subject.durationMinutes}分钟</TableCell>
                    <TableCell>¥{subject.price}</TableCell>
                    <TableCell className="hidden sm:table-cell">{subject.club}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(subject)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(subject.id)}>
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
