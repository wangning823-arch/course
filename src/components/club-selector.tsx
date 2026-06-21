'use client'

import * as React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Club { id: number; name: string }

export function ClubSelector() {
  const [clubs, setClubs] = React.useState<Club[]>([])
  const [currentClubId, setCurrentClubId] = React.useState<string>('')

  React.useEffect(() => {
    fetch('/api/clubs')
      .then((res) => res.json())
      .then((data) => {
        setClubs(data)
        const saved = localStorage.getItem('currentClubId')
        if (saved && data.some((c: Club) => c.id === parseInt(saved))) {
          setCurrentClubId(saved)
        } else if (data.length > 0) {
          setCurrentClubId(String(data[0].id))
          localStorage.setItem('currentClubId', String(data[0].id))
        }
      })
      .catch(() => {})
  }, [])

  const handleChange = (value: string) => {
    setCurrentClubId(value)
    localStorage.setItem('currentClubId', value)
    window.dispatchEvent(new CustomEvent('clubChanged', { detail: { clubId: value } }))
  }

  if (clubs.length === 0) return null

  return (
    <Select value={currentClubId} onValueChange={handleChange}>
      <SelectTrigger className="w-full sm:w-[200px] h-9">
        <SelectValue placeholder="选择俱乐部" />
      </SelectTrigger>
      <SelectContent>
        {clubs.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
