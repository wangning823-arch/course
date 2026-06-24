'use client'

import * as React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authFetch } from '@/lib/fetch-client'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function StudentStatsPage() {
  const [stats, setStats] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [period, setPeriod] = React.useState('month')

  React.useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await authFetch(`/api/student/my-stats?period=${period}`)
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('获取统计数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">学习统计</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded-md text-sm ${period === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            本周
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 rounded-md text-sm ${period === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            本月
          </button>
          <button
            onClick={() => setPeriod('quarter')}
            className={`px-3 py-1 rounded-md text-sm ${period === 'quarter' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            本季度
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-3 py-1 rounded-md text-sm ${period === 'year' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            本年
          </button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{stats?.totalLessons || 0}</p>
            <p className="text-sm text-gray-500">总课时</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{stats?.totalMinutes || 0}</p>
            <p className="text-sm text-gray-500">总时长(分钟)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-500">{stats?.completedLessons || 0}</p>
            <p className="text-sm text-gray-500">已完成</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-orange-500">{stats?.pendingLessons || 0}</p>
            <p className="text-sm text-gray-500">待确认</p>
          </CardContent>
        </Card>
      </div>

      {/* 月度趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">月度趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.monthlyTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="课时数" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* 科目分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">科目分布</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.subjectStats?.length > 0 ? (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.subjectStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.subjectStats.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {stats.subjectStats.map((subject: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{subject.name}</span>
                    <span className="text-sm text-gray-500">({subject.count}课时)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
