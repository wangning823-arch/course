'use client'

import * as React from 'react'
import { User, Phone, Shield, Save, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUserStore } from '@/stores/user-store'
import { authFetch } from '@/lib/fetch-client'

const roleLabels: Record<string, string> = {
  super_admin: '超级管理员',
  club_admin: '俱乐部管理员',
  coach: '教练',
  full_time_coach: '全职教练',
  part_time_coach: '兼职教练',
  parent: '家长',
  student: '学员',
}

export default function ProfilePage() {
  const storeUser = useUserStore((s) => s.user)
  const updateUser = useUserStore((s) => s.updateUser)
  const [user, setUser] = React.useState<any>(null)
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState('')

  // 密码修改
  const [oldPassword, setOldPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [changingPwd, setChangingPwd] = React.useState(false)
  const [pwdMsg, setPwdMsg] = React.useState('')

  React.useEffect(() => {
    if (storeUser) {
      setUser(storeUser)
      setName(storeUser.name || '')
      setPhone(storeUser.phone || '')
    }
  }, [storeUser])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setMsg('')
    try {
      const res = await authFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })
      if (!res.ok) {
        const err = await res.json()
        setMsg(err.error || '保存失败')
        return
      }
      const updated = await res.json()
      const newUser = { ...user, name: updated.name, phone: updated.phone }
      updateUser({ name: updated.name, phone: updated.phone })
      setUser(newUser)
      setMsg('保存成功')
    } catch (e) {
      setMsg('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!user) return
    if (!oldPassword) {
      setPwdMsg('请输入原密码')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setPwdMsg('新密码至少6位')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg('两次输入的密码不一致')
      return
    }
    setChangingPwd(true)
    setPwdMsg('')
    try {
      const res = await authFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPwdMsg(data.error || '修改失败')
        return
      }
      setPwdMsg('密码修改成功')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      setPwdMsg('网络错误')
    } finally {
      setChangingPwd(false)
    }
  }

  if (!user) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">个人中心</h1>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {msg && (
            <div className={`text-sm px-3 py-2 rounded-md ${
              msg === '保存成功'
                ? 'text-green-700 bg-green-50 border border-green-200'
                : 'text-red-500 bg-red-50 border border-red-200'
            }`}>
              {msg}
            </div>
          )}

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
              {name.charAt(0) || '用'}
            </div>
            <div>
              <div className="text-lg font-medium">{name}</div>
              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                {phone}
              </div>
              <div className="mt-1">
                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                  <Shield className="h-3 w-3" />
                  {roleLabels[user.role] || user.role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">姓名</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">手机号</label>
            <Input
              value={phone}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-400">手机号不可修改</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? '保存中...' : '保存修改'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            修改密码
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pwdMsg && (
            <div className={`text-sm px-3 py-2 rounded-md ${
              pwdMsg.includes('成功')
                ? 'text-green-700 bg-green-50 border border-green-200'
                : 'text-red-500 bg-red-50 border border-red-200'
            }`}>
              {pwdMsg}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">原密码</label>
            <Input
              type="password"
              placeholder="请输入原密码"
              value={oldPassword}
              onChange={(e) => { setOldPassword(e.target.value); setPwdMsg('') }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">新密码</label>
            <Input
              type="password"
              placeholder="请输入新密码（至少6位）"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwdMsg('') }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">确认新密码</label>
            <Input
              type="password"
              placeholder="请再次输入新密码"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPwdMsg('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={changingPwd}>
              <Lock className="h-4 w-4 mr-1" />
              {changingPwd ? '修改中...' : '修改密码'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
