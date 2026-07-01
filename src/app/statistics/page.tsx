'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { ClubSelector } from '@/components/club-selector'
import { useFetch } from '@/hooks/use-fetch'
import { useClubStore } from '@/stores/club-store'
import { useUserStore } from '@/stores/user-store'
import { StatisticsData, CoachRankingItem, StudentRankingItem, MonthlyTrendItem, SubjectDataItem } from '@/types/api'

type StatsData = StatisticsData & { monthIncome?: number }

export default function StatisticsPage() {
  const [period, setPeriod] = React.useState('month')
  const [customStartDate, setCustomStartDate] = React.useState('')
  const [customEndDate, setCustomEndDate] = React.useState('')
  const [isCustomRange, setIsCustomRange] = React.useState(false)
  const user = useUserStore((s) => s.user)
  const currentClubId = useClubStore((s) => s.currentClubId)

  // 构建 API URL
  const buildUrl = React.useCallback(() => {
    let url = `/api/statistics?period=${period}`

    // 自定义日期范围
    if (isCustomRange && customStartDate && customEndDate) {
      url += `&startDate=${customStartDate}&endDate=${customEndDate}`
    }

    if ((user?.role === 'coach' || user?.role === 'part_time_coach') && user?.id) {
      url += `&coachId=${user.id}`
      if (currentClubId && currentClubId !== 'all') {
        url += `&clubId=${currentClubId}`
      }
    } else {
      if (currentClubId && currentClubId !== 'all') {
        url += `&clubId=${currentClubId}`
      }
    }

    return url
  }, [period, user, currentClubId, isCustomRange, customStartDate, customEndDate])

  // 处理时间段选择
  const handlePeriodChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomRange(true)
      // 设置默认的自定义范围（上个月）
      const now = new Date()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      setCustomStartDate(formatDate(lastMonthStart))
      setCustomEndDate(formatDate(lastMonthEnd))
      setPeriod('custom')
    } else {
      setIsCustomRange(false)
      setPeriod(value)
    }
  }

  // 格式化日期为 YYYY-MM-DD
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const { data: stats, isLoading: loading } = useFetch<StatsData>(buildUrl(), {
    revalidateOnFocus: true,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">课时统计</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ClubSelector />
          <Select value={isCustomRange ? 'custom' : period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="lastWeek">上周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="lastMonth">上月</SelectItem>
              <SelectItem value="quarter">本季度</SelectItem>
              <SelectItem value="lastQuarter">上季度</SelectItem>
              <SelectItem value="year">本年</SelectItem>
              <SelectItem value="lastYear">去年</SelectItem>
              <SelectItem value="custom">自定义范围</SelectItem>
            </SelectContent>
          </Select>

          {/* 自定义日期范围选择器 - 桌面端同行 */}
          {isCustomRange && (
            <div className="hidden sm:flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm"
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
          )}
          {/* 自定义日期范围选择器 - 手机端换行 */}
          {isCustomRange && (
            <div className="sm:hidden flex items-center gap-2 w-full mt-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm flex-1 min-w-0"
              />
              <span className="text-gray-500 flex-shrink-0">至</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm flex-1 min-w-0"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">加载中...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">总课时</p>
                <p className="text-3xl font-bold text-blue-500 mt-1">{stats?.totalLessons || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">总时长</p>
                <p className="text-3xl font-bold text-green-500 mt-1">{stats?.totalHours || 0}h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">活跃学员</p>
                <p className="text-3xl font-bold text-yellow-500 mt-1">{stats?.activeStudents || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">教练数量</p>
                <p className="text-3xl font-bold text-red-500 mt-1">{stats?.coachRanking?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">课时收入</p>
                <p className="text-3xl font-bold text-purple-500 mt-1">¥{(stats?.monthIncome || 0).toLocaleString()}</p>
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
                {(!stats?.monthlyTrend || stats?.monthlyTrend.length === 0) ? (
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
                {(!stats?.subjectData || stats.subjectData.length === 0) ? (
                  <div className="p-8 text-center text-gray-500">暂无数据</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={stats.subjectData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {stats.subjectData.map((entry: SubjectDataItem & { color?: string }, index: number) => (
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
              {!stats?.coachRanking || stats.coachRanking.length === 0 ? (
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
                      <TableHead className="hidden sm:table-cell">主授科目</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.coachRanking.map((coach: CoachRankingItem & { rank?: number; students?: number; mainSubject?: string }) => (
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
                        <TableCell className="hidden sm:table-cell">{coach.mainSubject}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Student Ranking */}
          <Card>
            <CardHeader>
              <CardTitle>学员排名</CardTitle>
            </CardHeader>
            <CardContent>
              {!stats?.studentRanking || stats.studentRanking.length === 0 ? (
                <div className="p-8 text-center text-gray-500">暂无数据</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>排名</TableHead>
                      <TableHead>学员</TableHead>
                      <TableHead>课时数</TableHead>
                      <TableHead>总时长</TableHead>
                      <TableHead>科目数</TableHead>
                      <TableHead className="hidden sm:table-cell">所属教练</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.studentRanking.map((student: StudentRankingItem & { rank?: number; subjects?: number; coachName?: string }) => (
                      <TableRow key={student.rank}>
                        <TableCell>
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                            student.rank === 1 ? 'bg-yellow-500' : student.rank === 2 ? 'bg-gray-400' : student.rank === 3 ? 'bg-orange-400' : 'bg-gray-300'
                          }`}>
                            {student.rank}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.lessons}节</TableCell>
                        <TableCell>{student.hours}小时</TableCell>
                        <TableCell>{student.subjects}科</TableCell>
                        <TableCell className="hidden sm:table-cell">{student.coachName}</TableCell>
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
