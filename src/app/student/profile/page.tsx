'use client'

import * as React from 'react'
import { User, Phone, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUserStore } from '@/stores/user-store'

export default function StudentProfilePage() {
  const user = useUserStore((s) => s.user)
  const updateUser = useUserStore((s) => s.updateUser)
  const [editing, setEditing] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: user?.name || '',
    phone: user?.phone || '',
  })

  const handleSave = async () => {
    // TODO: 实现保存逻辑
    updateUser({ ...user, ...formData })
    setEditing(false)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">个人中心</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-gray-500" />
            </div>
            <div>
              <h2 className="text-xl font-medium">{user?.name || '未知用户'}</h2>
              <p className="text-sm text-gray-500">{user?.role === 'student' ? '学员' : '家长'}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <label className="text-sm text-gray-500">姓名</label>
                {editing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{user?.name || '-'}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <label className="text-sm text-gray-500">手机号</label>
                <p className="font-medium">{user?.phone || '-'}</p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            {editing ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>取消</Button>
                <Button onClick={handleSave}>保存</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)}>编辑</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
