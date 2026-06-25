import * as XLSX from 'xlsx'
import { Lesson } from '@/types/api'

// 状态映射
const statusMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  cancelled: '已取消',
}

/**
 * 导出课时记录为 Excel 文件
 * @param lessons 课时记录数组
 * @param filename 文件名（可选，默认包含日期）
 */
export function exportLessons(lessons: Lesson[], filename?: string) {
  // 准备导出数据
  const data = lessons.map((lesson, index) => ({
    '序号': index + 1,
    '日期': lesson.date,
    '科目': lesson.subject,
    '教练': lesson.coach,
    '学员': lesson.student,
    '校区': lesson.campus || '-',
    '时长(分钟)': lesson.duration,
    '状态': statusMap[lesson.status] || lesson.status,
  }))

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data)

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 6 },   // 序号
    { wch: 12 },  // 日期
    { wch: 15 },  // 科目
    { wch: 10 },  // 教练
    { wch: 10 },  // 学员
    { wch: 15 },  // 校区
    { wch: 12 },  // 时长
    { wch: 10 },  // 状态
  ]

  // 创建工作簿
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '课时记录')

  // 生成文件名
  const exportFilename = filename || `课时记录_${new Date().toISOString().slice(0, 10)}.xlsx`

  // 下载文件
  XLSX.writeFile(workbook, exportFilename)
}
