<template>
  <div class="schedule-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>排课管理</span>
          <div class="header-actions">
            <el-button @click="viewMode = 'day'">日</el-button>
            <el-button @click="viewMode = 'week'" type="primary">周</el-button>
            <el-button @click="viewMode = 'month'">月</el-button>
            <el-divider direction="vertical" />
            <el-button type="primary" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              新建课程
            </el-button>
          </div>
        </div>
      </template>

      <!-- 日历视图 -->
      <div class="calendar-container">
        <div class="calendar-header">
          <el-button @click="prevWeek">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <h3>{{ currentWeekRange }}</h3>
          <el-button @click="nextWeek">
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>

        <!-- 周视图 -->
        <div class="week-view" v-if="viewMode === 'week'">
          <div class="time-column">
            <div class="time-slot" v-for="hour in timeSlots" :key="hour">
              {{ hour }}:00
            </div>
          </div>
          <div class="day-column" v-for="day in weekDays" :key="day.date">
            <div class="day-header">{{ day.label }}</div>
            <div class="day-slots">
              <div
                class="course-event"
                v-for="course in getCoursesForDay(day.date)"
                :key="course.id"
                :style="getCourseStyle(course)"
                @click="showCourseDetail(course)"
              >
                <div class="course-time">{{ course.startTime }}-{{ course.endTime }}</div>
                <div class="course-subject">{{ course.subject }}</div>
                <div class="course-coach">{{ course.coach }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 新建课程对话框 -->
    <el-dialog v-model="dialogVisible" title="新建课程" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="课程科目">
          <el-select v-model="form.subjectId" placeholder="请选择科目">
            <el-option label="篮球基础" :value="1" />
            <el-option label="钢琴一对一" :value="2" />
            <el-option label="足球训练" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="授课教练">
          <el-select v-model="form.coachId" placeholder="请选择教练">
            <el-option label="张教练" :value="1" />
            <el-option label="李老师" :value="2" />
            <el-option label="王教练" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="授课方式">
          <el-radio-group v-model="form.teachingMode">
            <el-radio value="private">一对一</el-radio>
            <el-radio value="group">一对多</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="上课日期">
          <el-date-picker v-model="form.date" type="date" placeholder="选择日期" />
        </el-form-item>
        <el-form-item label="上课时间">
          <el-time-picker v-model="form.timeRange" is-range range-separator="至" start-placeholder="开始时间" end-placeholder="结束时间" />
        </el-form-item>
        <el-form-item label="校区">
          <el-select v-model="form.campusId" placeholder="请选择校区">
            <el-option label="主校区" :value="1" />
            <el-option label="分校区" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="上课地点">
          <el-input v-model="form.location" placeholder="请输入具体教室/场地" />
        </el-form-item>
        <el-form-item label="参与学员">
          <el-select v-model="form.studentIds" multiple placeholder="请选择学员">
            <el-option label="李明" :value="1" />
            <el-option label="王华" :value="2" />
            <el-option label="小红" :value="3" />
            <el-option label="赵强" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
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
import { Plus, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const viewMode = ref('week')
const dialogVisible = ref(false)

const form = ref({
  subjectId: null,
  coachId: null,
  teachingMode: 'private',
  date: null,
  timeRange: null,
  campusId: null,
  location: '',
  studentIds: [],
  remark: '',
})

// 时间槽
const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8) // 8:00 - 19:00

// 周日期
const weekDays = computed(() => {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + 1)

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return {
      date: date.toISOString().split('T')[0],
      label: `${['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i]} ${date.getMonth() + 1}/${date.getDate()}`,
    }
  })
})

const currentWeekRange = computed(() => {
  if (weekDays.value.length === 0) return ''
  return `${weekDays.value[0].label} - ${weekDays.value[6].label}`
})

// 模拟课程数据
const courses = ref([
  { id: 1, subject: '篮球基础', coach: '张教练', date: '2024-01-15', startTime: '09:00', endTime: '10:00', location: '篮球场A' },
  { id: 2, subject: '钢琴一对一', coach: '李老师', date: '2024-01-15', startTime: '10:30', endTime: '11:30', location: '琴房1' },
  { id: 3, subject: '足球训练', coach: '王教练', date: '2024-01-16', startTime: '14:00', endTime: '15:00', location: '足球场' },
])

const getCoursesForDay = (date: string) => {
  return courses.value.filter(c => c.date === date)
}

const getCourseStyle = (course: any) => {
  const startHour = parseInt(course.startTime.split(':')[0])
  const startMin = parseInt(course.startTime.split(':')[1])
  const endHour = parseInt(course.endTime.split(':')[0])
  const endMin = parseInt(course.endTime.split(':')[1])

  const top = ((startHour - 8) * 60 + startMin) * (60 / 60) // 60px per hour
  const height = ((endHour - startHour) * 60 + (endMin - startMin)) * (60 / 60)

  return {
    top: `${top}px`,
    height: `${height}px`,
  }
}

const showAddDialog = () => {
  form.value = {
    subjectId: null,
    coachId: null,
    teachingMode: 'private',
    date: null,
    timeRange: null,
    campusId: null,
    location: '',
    studentIds: [],
    remark: '',
  }
  dialogVisible.value = true
}

const showCourseDetail = (course: any) => {
  ElMessage.info(`查看课程: ${course.subject}`)
}

const handleSubmit = () => {
  dialogVisible.value = false
  ElMessage.success('创建成功')
}

const prevWeek = () => {
  ElMessage.info('上一周')
}

const nextWeek = () => {
  ElMessage.info('下一周')
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-container {
  margin-top: 16px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  gap: 16px;
}

.calendar-header h3 {
  margin: 0;
  min-width: 200px;
  text-align: center;
}

.week-view {
  display: flex;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.time-column {
  width: 60px;
  border-right: 1px solid #ebeef5;
  background: #fafafa;
}

.time-slot {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
  border-bottom: 1px solid #ebeef5;
}

.day-column {
  flex: 1;
  border-right: 1px solid #ebeef5;
  position: relative;
}

.day-column:last-child {
  border-right: none;
}

.day-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
  font-weight: bold;
}

.day-slots {
  position: relative;
  height: 720px; /* 12 hours * 60px */
}

.course-event {
  position: absolute;
  left: 4px;
  right: 4px;
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  overflow: hidden;
}

.course-event:hover {
  background: #d9ecff;
}

.course-time {
  font-weight: bold;
  color: #409eff;
}

.course-subject {
  margin-top: 2px;
}

.course-coach {
  color: #909399;
  margin-top: 2px;
}
</style>
