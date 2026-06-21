'use client'

import * as React from 'react'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const teachingModeLabels: Record<string, string> = {
  private: '一对一',
  duo: '一对二',
  group: '一对多',
}

interface Coach { id: number; name: string }
interface Subject { id: number; name: string }
interface Club { id: number; name: string }

export default function CoachPricesPage() {
  const [prices, setPrices] = React.useState<any[]>([])
  const [coaches, setCoaches] = React.useState<Coach[]>([])
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [clubs, setClubs] = React.useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ coachId: '', subjectId: '', teachingMode: 'private', price: '' })
  const [role, setRole] = React.useState('')

  // 获取当前用户信息和俱乐部列表
  React.useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) return
    const user = JSON.parse(stored)
    setRole(user.role || '')

    if (user.role === 'super_admin') {
      // 超管：获取所有俱乐部
      fetch('/api/clubs').then((res) => res.json()).then((data) => {
        setClubs(data)
        const saved = localStorage.getItem('currentClubId')
        if (saved && data.some((c: Club) => c.id === parseInt(saved))) {
          setSelectedClubId(saved)
        } else if (data.length > 0) {
          setSelectedClubId(String(data[0].id))
        }
      })
    } else {
      // 俱乐部管理员/教练：直接用自己的 clubId
      const clubId = user.clubId || localStorage.getItem('currentClubId')
      if (clubId) {
        setSelectedClubId(String(clubId))
      }
    }
  }, [])

  const fetchPrices = async () => {
    if (!selectedClubId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/coach-prices?clubId=${selectedClubId}`)
      const data = await res.json()
      setPrices(data)
    } catch (error) {
      console.error('获取定价失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    if (!selectedClubId) return
    try {
      const [coachRes, subjectRes] = await Promise.all([
        fetch(`/api/users?role=coach&clubId=${selectedClubId}`),
        fetch(`/api/subjects?clubId=${selectedClubId}`),
      ])
      const [coachData, subjectData] = await Promise.all([coachRes.json(), subjectRes.json()])
      setCoaches(coachData)
      setSubjects(subjectData)
    } catch (error) {
      console.error('获取选项失败:', error)
    }
  }

  React.useEffect(() => {
    if (selectedClubId) {
      fetchPrices()
      fetchOptions()
    }
  }, [selectedClubId])

  const handleSubmit = async () => {
    if (!formData.coachId || !formData.subjectId || !formData.price) {
      alert('请填写完整信息')
      return
    }
    try {
      const res = await fetch('/api/coach-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: selectedClubId,
          coachId: formData.coachId,
          subjectId: formData.subjectId,
          teachingMode: formData.teachingMode,
          price: parseFloat(formData.price),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || '操作失败')
        return
      }
      setDialogOpen(false)
      setFormData({ coachId: '', subjectId: '', teachingMode: 'private', price: '' })
      fetchPrices()
    } catch (error) {
      alert('操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该定价吗？')) return
    try {
      await fetch(`/api/coach-prices/${id}`, { method: 'DELETE' })
      fetchPrices()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">教练定价</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchPrices}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setFormData({ coachId: '', subjectId: '', teachingMode: 'private', price: '' })}>
                <Plus className="h-4 w-4 mr-1" />添加定价
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加定价</DialogTitle>
                <DialogDescription>为教练设置科目和授课模式的单价</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">教练 *</label>
                  <Select value={formData.coachId} onValueChange={(v) => setFormData({ ...formData, coachId: v })}>
                    <SelectTrigger><SelectValue placeholder="选择教练" /></SelectTrigger>
                    <SelectContent>
                      {coaches.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">科目 *</label>
                  <Select value={formData.subjectId} onValueChange={(v) => setFormData({ ...formData, subjectId: v })}>
                    <SelectTrigger><SelectValue placeholder="选择科目" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">授课模式 *</label>
                  <Select value={formData.teachingMode} onValueChange={(v) => setFormData({ ...formData, teachingMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">一对一</SelectItem>
                      <SelectItem value="duo">一对二</SelectItem>
                      <SelectItem value="group">一对多</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">课时单价(元) *</label>
                  <Input
                    type="number"
                    placeholder="如：150"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
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

      {clubs.length > 1 && role === 'super_admin' && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">俱乐部：</span>
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择俱乐部" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : prices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无定价，请点击「添加定价」设置教练单价</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>教练</TableHead>
                  <TableHead>科目</TableHead>
                  <TableHead>授课模式</TableHead>
                  <TableHead>课时单价</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell className="font-medium">{price.coachName}</TableCell>
                    <TableCell>{price.subjectName}</TableCell>
                    <TableCell>
                      <Badge variant={price.teachingMode === 'private' ? 'default' : price.teachingMode === 'duo' ? 'secondary' : 'outline'}>
                        {teachingModeLabels[price.teachingMode] || price.teachingMode}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">¥{price.price}/课时</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(price.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
