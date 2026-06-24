'use client'

import * as React from 'react'
import Link from 'next/link'
import { Users, Calendar, CalendarPlus, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { authFetch } from '@/lib/fetch-client'

export default function ParentHomePage() {
  const [children, setChildren] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await authFetch('/api/parent/children')
        if (res.ok) {
          const data = await res.json()
          setChildren(data.linked || [])
        }
      } catch (error) {
        console.error('获取孩子列表失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChildren()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">家长中心</h1>

      {/* 孩子列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">我的孩子</CardTitle>
        </CardHeader>
        <CardContent>
          {children.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">暂无关联的孩子</p>
              <Link href="/parent/children" className="text-blue-500 hover:underline mt-2 inline-block">
                去关联孩子
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map((child) => (
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
                  <Badge variant={child.userId ? 'default' : 'secondary'}>
                    {child.userId ? '已创建账号' : '未创建账号'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link href="/parent/children">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium">孩子管理</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/courses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">课程查看</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/parent/book">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <CalendarPlus className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <p className="font-medium">预约课程</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
