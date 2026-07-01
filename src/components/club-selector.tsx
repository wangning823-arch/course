'use client'

import * as React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authFetch } from '@/lib/fetch-client'
import { useUserStore } from '@/stores/user-store'
import { useClubStore } from '@/stores/club-store'

interface Club { id: number; name: string }

export function ClubSelector() {
  const [clubs, setClubs] = React.useState<Club[]>([])
  const user = useUserStore((s) => s.user)
  const currentClubId = useClubStore((s) => s.currentClubId)
  const setCurrentClubId = useClubStore((s) => s.setCurrentClubId)

  const role = user?.role || ''

  React.useEffect(() => {
    if (!role) return

    if (role === 'super_admin') {
      // 超管：获取所有俱乐部，默认选"全部俱乐部"
      authFetch('/api/clubs')
        .then((res) => res.json())
        .then((data) => {
          setClubs(Array.isArray(data) ? data : [])
          let newClubId: string
          if (currentClubId && (currentClubId === 'all' || data.some((c: Club) => c.id === parseInt(currentClubId)))) {
            newClubId = currentClubId
          } else {
            newClubId = 'all'
          }
          setCurrentClubId(newClubId)
        })
        .catch(() => {})
    } else {
      // 教练/管理员：获取自己所属的俱乐部
      authFetch('/api/auth/me/clubs')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setClubs(data)
            let newClubId: string
            // 教练角色默认选"全部俱乐部"
            if (role === 'coach' || role === 'part_time_coach') {
              newClubId = 'all'
            } else {
              // 管理员/全职教练：有保存的且有效就用保存的，否则按俱乐部数量处理
              if (currentClubId && (currentClubId === 'all' || data.some((c: Club) => c.id === parseInt(currentClubId)))) {
                newClubId = currentClubId
              } else if (data.length > 1) {
                newClubId = 'all'
              } else {
                newClubId = String(data[0].id)
              }
            }
            setCurrentClubId(newClubId)
          }
        })
        .catch(() => {})
    }
  }, [role])

  const handleChange = (value: string) => {
    setCurrentClubId(value)
  }

  // 教练角色：有俱乐部就显示选择器（方便切换"全部"和具体俱乐部）
  // 管理员角色：多俱乐部时才显示
  if (role !== 'coach' && role !== 'part_time_coach' && clubs.length <= 1) return null

  return (
    <Select value={currentClubId || ''} onValueChange={handleChange}>
      <SelectTrigger className="w-[120px] sm:w-[200px] h-9">
        <SelectValue placeholder="选择俱乐部" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部俱乐部</SelectItem>
        {clubs.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
