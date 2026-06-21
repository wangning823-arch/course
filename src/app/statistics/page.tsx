'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { ClubSelector } from '@/components/club-selector'

export default function StatisticsPage() {
  const [period, setPeriod] = React.useState('month')
  const [stats, setStats] = React.useState({
    totalLessons: 0,
    totalHours: 0,
    activeStudents: 0,
    coachRanking: [] as any[],
    monthlyTrend: [] as any[],
    subjectData: [] as any[],
  })
  const [loading, setLoading] = React.useState(true)

  const fetchStats = async () => {
    const clubId = localStorage.getItem('currentClubId')
    if (!clubId) return

    // 获取当前用户信息
    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : null

    setLoading(true)
    try {
      let url = `/api/statistics?clubId=${clubId}&period=${period}`

      // 教练只能看自己的统计
      if (user?.role === 'coach' && user?.id) {
        url += `&coachId=${user.id}`
      }

      const res = await fetch(url)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchStats()
  }, [period])

  // 监听俱乐部切换
  React.useEffect(() => {
    const handleClubChanged = () => fetchStats()
    window.addEventListener('clubChanged', handleClubChanged)
    return () => window.removeEventListener('clubChanged', handleClubChanged)
  }, [fetchStats])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">课时统计</h1>
        <div className="flex items-center gap-3">
          <ClubSelector />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="quarter">本季度</SelectItem>
              <SelectItem value="year">本年</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">加载中...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">总课时</p>
                <p className="text-3xl font-bold text-blue-500 mt-1">{stats.totalLessons}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">总时长</p>
                <p className="text-3xl font-bold text-green-500 mt-1">{stats.totalHours}h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">活跃学员</p>
                <p className="text-3xl font-bold text-yellow-500 mt-1">{stats.activeStudents}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">教练数量</p>
                <p className="text-3xl font-bold text-red-500 mt-1">{stats.coachRanking.length}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>月度课时趋势</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.monthlyTrend.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">暂无数据</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="课时" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Subject Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>科目分布</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.subjectData.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">暂无数据</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={stats.subjectData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {stats.subjectData.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coach Ranking */}
          <Card>
            <CardHeader>
              <CardTitle>教练排名</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.coachRanking.length === 0 ? (
                <div className="p-8 text-center text-gray-500">暂无数据</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>排名</TableHead>
                      <TableHead>教练</TableHead>
                      <TableHead>课时数</TableHead>
                      <TableHead>总时长</TableHead>
                      <TableHead>学员数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.coachRanking.map((coach: any) => (
                      <TableRow key={coach.rank}>
                        <TableCell>
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                            coach.rank === 1 ? 'bg-yellow-500' : coach.rank === 2 ? 'bg-gray-400' : coach.rank === 3 ? 'bg-orange-400' : 'bg-gray-300'
                          }`}>
                            {coach.rank}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{coach.name}</TableCell>
                        <TableCell>{coach.lessons}节</TableCell>
                        <TableCell>{coach.hours}小时</TableCell>
                        <TableCell>{coach.students}人</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
