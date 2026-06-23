'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [phone, setPhone] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleLogin = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的11位手机号')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '登录失败')
        return
      }
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      // 非超管：存储俱乐部ID到 localStorage
      // 教练默认选"全部俱乐部"
      if (data.user.role === 'coach' || data.user.role === 'part_time_coach') {
        localStorage.setItem('currentClubId', 'all')
      } else if (data.user.clubId) {
        localStorage.setItem('currentClubId', String(data.user.clubId))
      }
      window.location.href = '/'
    } catch (e) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">课时管理系统</CardTitle>
          <CardDescription>请使用手机号和密码登录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">手机号</label>
            <Input
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError('') }}
              maxLength={11}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">密码</label>
            <Input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </Button>
          <div className="text-xs text-center text-gray-400 space-y-1">
            <p>系统管理员：13800000001 / 123456</p>
            <p>俱乐部管理员：13800000002 / 123456</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
