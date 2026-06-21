<template>
  <div class="lessons-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>课时记录</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            录入课时
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item label="教练">
          <el-select v-model="searchForm.coachId" placeholder="请选择教练" clearable>
            <el-option label="张教练" :value="1" />
            <el-option label="李老师" :value="2" />
            <el-option label="王教练" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="学员">
          <el-input v-model="searchForm.studentName" placeholder="请输入学员姓名" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 课时列表 -->
      <el-table :data="lessons" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="time" label="时间" width="120" />
        <el-table-column prop="subject" label="科目" width="120" />
        <el-table-column prop="coach" label="教练" width="100" />
        <el-table-column prop="student" label="学员" width="100" />
        <el-table-column prop="duration" label="时长" width="80">
          <template #default="{ row }">
            {{ row.duration }}分钟
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="info" text size="small" @click="handleView(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <!-- 录入课时对话框 -->
    <el-dialog v-model="dialogVisible" title="录入课时" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="关联课程">
          <el-select v-model="form.courseId" placeholder="请选择课程">
            <el-option label="篮球基础 - 张教练 - 09:00-10:00" :value="1" />
            <el-option label="钢琴一对一 - 李老师 - 10:30-11:30" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="实际开始">
          <el-time-picker v-model="form.actualStart" placeholder="选择开始时间" />
        </el-form-item>
        <el-form-item label="实际结束">
          <el-time-picker v-model="form.actualEnd" placeholder="选择结束时间" />
        </el-form-item>
        <el-form-item label="课程内容">
          <el-input v-model="form.content" type="textarea" :rows="3" placeholder="请输入本次课的教学内容" />
        </el-form-item>
        <el-form-item label="学生表现">
          <el-input v-model="form.performance" type="textarea" :rows="2" placeholder="请输入学生表现评价" />
        </el-form-item>
        <el-form-item label="课后作业">
          <el-input v-model="form.homework" type="textarea" :rows="2" placeholder="请输入布置的作业" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'

// 搜索表单
const searchForm = ref({
  dateRange: null,
  coachId: null,
  studentName: '',
})

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(100)

// 对话框
const dialogVisible = ref(false)
const form = ref({
  courseId: null,
  actualStart: null,
  actualEnd: null,
  content: '',
  performance: '',
  homework: '',
})

// 模拟数据
const lessons = ref([
  { id: 1, date: '2024-01-15', time: '09:00-10:00', subject: '篮球基础', coach: '张教练', student: '李明', duration: 60, status: '已完成' },
  { id: 2, date: '2024-01-15', time: '10:30-11:30', subject: '钢琴一对一', coach: '李老师', student: '小红', duration: 60, status: '待确认' },
  { id: 3, date: '2024-01-16', time: '14:00-15:00', subject: '足球训练', coach: '王教练', student: '赵强', duration: 60, status: '待确认' },
])

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    '已完成': 'success',
    '待确认': 'warning',
    '已取消': 'danger',
  }
  return map[status] || 'info'
}

const showAddDialog = () => {
  form.value = {
    courseId: null,
    actualStart: null,
    actualEnd: null,
    content: '',
    performance: '',
    homework: '',
  }
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  ElMessage.info(`编辑课时: ${row.id}`)
}

const handleView = (row: any) => {
  ElMessage.info(`查看课时: ${row.id}`)
}

const handleSubmit = () => {
  dialogVisible.value = false
  ElMessage.success('录入成功')
}

const handleSearch = () => {
  currentPage.value = 1
  // TODO: 调用搜索API
}

const handleReset = () => {
  searchForm.value = { dateRange: null, coachId: null, studentName: '' }
  handleSearch()
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
