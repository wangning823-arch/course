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

export default function SubjectsPage() {
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [clubs, setClubs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({
    clubId: '', name: '', category: '球类', durationMinutes: '60',
  })
  const [editId, setEditId] = React.useState<number | null>(null)
  const [role, setRole] = React.useState('')
  const [userId, setUserId] = React.useState<number | null>(null)
  const [userClubId, setUserClubId] = React.useState('')
  const [showPrivate, setShowPrivate] = React.useState(false)

  React.useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      setRole(user.role || '')
      setUserId(user.id || null)
      if (user.clubId) setUserClubId(String(user.clubId))
    }
  }, [])

  const isClubAdmin = role === 'club_admin'

  const fetchSubjects = async () => {
    setLoading(true)
    try {
      let url: string
      if (showPrivate && role === 'coach' && userId) {
        // 教练查看私人科目
        url = `/api/subjects?clubId=private&coachId=${userId}`
      } else {
        const clubId = isClubAdmin ? userClubId : localStorage.getItem('currentClubId')
        // 教练：传递 coachId 以加载所有俱乐部科目 + 私人科目
        // 管理员：按俱乐部过滤
        if (role === 'coach' && userId) {
          url = clubId && clubId !== 'all'
            ? `/api/subjects?clubId=${clubId}&coachId=${userId}`
            : `/api/subjects?coachId=${userId}`
        } else {
          url = clubId && clubId !== 'all'
            ? `/api/subjects?clubId=${clubId}`
            : '/api/subjects'
        }
      }
      const res = await authFetch(url)
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
      // 俱乐部管理员只需要自己的俱乐部
      if (isClubAdmin && userClubId) {
        const res = await authFetch(`/api/clubs/${userClubId}`)
        const data = await res.json()
        if (data) setClubs([data])
        return
      }
      const res = await authFetch('/api/clubs')
      const data = await res.json()
      setClubs(data)
    } catch (error) {
      console.error('获取俱乐部失败:', error)
    }
  }

  React.useEffect(() => {
    if (isClubAdmin && !userClubId) return
    fetchSubjects()
    fetchClubs()
  }, [isClubAdmin, userClubId, role])

  // 监听俱乐部切换
  React.useEffect(() => {
    const handleClubChanged = () => {
      fetchSubjects()
    }
    window.addEventListener('clubChanged', handleClubChanged)
    return () => window.removeEventListener('clubChanged', handleClubChanged)
  }, [])

  // 监听 showPrivate 变化，重新加载科目
  React.useEffect(() => {
    if (role === 'coach') {
      fetchSubjects()
    }
  }, [showPrivate])

  const handleSubmit = async () => {
    try {
      let submitData: any
      if (showPrivate && role === 'coach' && userId) {
        // 创建/编辑私人科目
        submitData = {
          ...formData,
          clubId: null,
          coachId: userId,
        }
      } else {
        // 俱乐部管理员强制用自己的 clubId
        const submitClubId = isClubAdmin ? userClubId : formData.clubId
        submitData = { ...formData, clubId: submitClubId }
      }

      if (editId) {
        await authFetch(`/api/subjects/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        })
      } else {
        await authFetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        })
      }
      setDialogOpen(false)
      setFormData({ clubId: '', name: '', category: '球类', durationMinutes: '60' })
      setEditId(null)
      fetchSubjects()
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该科目吗？')) return
    try {
      await authFetch(`/api/subjects/${id}`, { method: 'DELETE' })
      fetchSubjects()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleEdit = (subject: any) => {
    setFormData({
      clubId: isClubAdmin ? userClubId : String(subject.clubId || ''),
      name: subject.name,
      category: subject.category || '球类',
      durationMinutes: String(subject.durationMinutes || 60),
    })
    setEditId(subject.id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">科目管理</h1>
        <div className="flex items-center gap-2">
          <ClubSelector />
          {/* 教练可以切换俱乐部科目和私人科目 */}
          {role === 'coach' && (
            <div className="flex items-center gap-2 border rounded-md p-1">
              <Button
                variant={!showPrivate ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowPrivate(false)}
                className="h-7 text-xs"
              >
                俱乐部科目
              </Button>
              <Button
                variant={showPrivate ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowPrivate(true)}
                className="h-7 text-xs"
              >
                私人科目
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={fetchSubjects}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setFormData({ clubId: '', name: '', category: '球类', durationMinutes: '60' }); setEditId(null) }}>
                <Plus className="h-4 w-4 mr-1" />添加科目
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? '编辑科目' : '添加科目'}</DialogTitle>
                <DialogDescription>填写科目信息</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* 私人科目不显示俱乐部选择器 */}
                {!(showPrivate && role === 'coach') && (
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
                )}
                {showPrivate && role === 'coach' && (
                  <div className="p-2 bg-blue-50 rounded-md text-sm text-blue-700">
                    这是您的私人科目，仅您可见，不关联任何俱乐部
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">科目名称</label>
                  <Input placeholder="请输入科目名称" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
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
                  <label className="text-sm font-medium">默认时长(分钟)</label>
                  <Input type="number" placeholder="60" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })} />
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
                  <TableHead className="hidden sm:table-cell">默认时长</TableHead>
                  <TableHead className="hidden sm:table-cell">所属俱乐部</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>{subject.category}</TableCell>
                    <TableCell className="hidden sm:table-cell">{subject.durationMinutes}分钟</TableCell>
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
