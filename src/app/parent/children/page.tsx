'use client'

import * as React from 'react'
import Link from 'next/link'
import { Users, Plus, Link as LinkIcon, Check, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { authFetch } from '@/lib/fetch-client'

export default function ParentChildrenPage() {
  const [linkedChildren, setLinkedChildren] = React.useState<any[]>([])
  const [unlinkedStudents, setUnlinkedStudents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false)
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null)
  const [linking, setLinking] = React.useState(false)

  const fetchChildren = async () => {
    try {
      const res = await authFetch('/api/parent/children')
      if (res.ok) {
        const data = await res.json()
        setLinkedChildren(data.linked || [])
        setUnlinkedStudents(data.unlinked || [])
      }
    } catch (error) {
      console.error('获取孩子列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchChildren()
  }, [])

  const handleLink = async () => {
    if (!selectedStudent) return
    setLinking(true)
    try {
      const res = await authFetch('/api/parent/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent.id }),
      })
      if (res.ok) {
        setLinkDialogOpen(false)
        setSelectedStudent(null)
        fetchChildren()
      } else {
        const data = await res.json()
        alert(data.error || '关联失败')
      }
    } catch (error) {
      console.error('关联失败:', error)
      alert('关联失败')
    } finally {
      setLinking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/parent" className="hover:text-gray-700">首页</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900 font-medium">孩子管理</span>
      </div>

      {/* 已关联的孩子 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">已关联的孩子</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedChildren.length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无关联的孩子</p>
          ) : (
            <div className="space-y-3">
              {linkedChildren.map((child) => (
                <div key={child.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{child.name}</p>
                      <p className="text-sm text-gray-500">
                        {child.club?.name || '未分配俱乐部'} | {child.coach?.name || '未分配教练'}
                      </p>
                    </div>
                  </div>
                  {child.userId && (
                    <Badge variant="default">已创建账号</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 可关联的学员 */}
      {unlinkedStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">可关联的学员</CardTitle>
            <p className="text-sm text-gray-500">以下是系统中与您手机号匹配的学员</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unlinkedStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-500">
                        {student.club?.name || '未分配俱乐部'} | {student.coach?.name || '未分配教练'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedStudent(student)
                      setLinkDialogOpen(true)
                    }}
                  >
                    <LinkIcon className="h-4 w-4 mr-1" />
                    关联
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 关联确认对话框 */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认关联</DialogTitle>
            <DialogDescription>
              确定要将 {selectedStudent?.name} 关联为您的孩子吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>取消</Button>
            <Button onClick={handleLink} disabled={linking}>
              {linking ? '关联中...' : '确认关联'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
