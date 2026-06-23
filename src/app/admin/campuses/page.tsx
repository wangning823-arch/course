'use client'

import * as React from 'react'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClubSelector } from '@/components/club-selector'
import { authFetch } from '@/lib/fetch-client'
import { useApi, mutate } from '@/hooks/use-api'
import { useUserStore } from '@/stores/user-store'
import { useClubStore } from '@/stores/club-store'

export default function CampusesPage() {
  const user = useUserStore((s) => s.user)
  const currentClubId = useClubStore((s) => s.currentClubId)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ clubId: '', name: '', address: '', phone: '' })
  const [editId, setEditId] = React.useState<number | null>(null)

  const role = user?.role || ''
  const userClubId = user?.clubId ? String(user.clubId) : ''
  const isClubAdmin = role === 'club_admin'

  // 构建校区 API URL
  const campusesUrl = React.useMemo(() => {
    const clubId = isClubAdmin ? userClubId : currentClubId
    return clubId ? `/api/campuses?clubId=${clubId}` : '/api/campuses'
  }, [isClubAdmin, userClubId, currentClubId])

  const { data: campuses, isLoading: loading } = useApi<any[]>(campusesUrl)

  // 俱乐部列表
  const clubsUrl = isClubAdmin && userClubId ? `/api/clubs/${userClubId}` : '/api/clubs'
  const { data: clubsData } = useApi<any>(clubsUrl)
  const clubs = React.useMemo(() => {
    if (isClubAdmin && userClubId && clubsData) return [clubsData]
    if (Array.isArray(clubsData)) return clubsData
    return []
  }, [clubsData, isClubAdmin, userClubId])

  React.useEffect(() => {
    // SWR 自动加载数据
  }, [])

  const handleSubmit = async () => {
    try {
      const submitClubId = isClubAdmin ? userClubId : formData.clubId
      const submitData = { ...formData, clubId: submitClubId }
      if (editId) {
        await authFetch(`/api/campuses/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        })
      } else {
        await authFetch('/api/campuses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        })
      }
      setDialogOpen(false)
      setFormData({ clubId: '', name: '', address: '', phone: '' })
      setEditId(null)
      mutate(campusesUrl)
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该校区吗？')) return
    try {
      await authFetch(`/api/campuses/${id}`, { method: 'DELETE' })
      mutate(campusesUrl)
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleEdit = (campus: any) => {
    setFormData({ clubId: isClubAdmin ? userClubId : String(campus.clubId || ''), name: campus.name, address: campus.address || '', phone: campus.phone || '' })
    setEditId(campus.id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">校区管理</h1>
        <div className="flex items-center gap-2">
          <ClubSelector />
          <Button variant="outline" onClick={() => mutate(campusesUrl)}>
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
                  {isClubAdmin ? (
                    <Input value={clubs.find(c => c.id === parseInt(userClubId))?.name || ''} disabled className="bg-gray-50" />
                  ) : (
                    <Select value={formData.clubId} onValueChange={(v) => setFormData({ ...formData, clubId: v })}>
                      <SelectTrigger><SelectValue placeholder="选择俱乐部" /></SelectTrigger>
                      <SelectContent>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
          ) : !campuses || campuses.length === 0 ? (
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
