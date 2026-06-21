<template>
  <div class="dashboard">
    <h1>首页</h1>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background-color: #409eff">
              <el-icon :size="24"><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">128</div>
              <div class="stat-label">本月课程</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background-color: #67c23a">
              <el-icon :size="24"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">96</div>
              <div class="stat-label">本月课时</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background-color: #e6a23c">
              <el-icon :size="24"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">32</div>
              <div class="stat-label">活跃学员</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background-color: #f56c6c">
              <el-icon :size="24"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥28,800</div>
              <div class="stat-label">本月收入</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 今日课程 -->
    <el-card class="section-card">
      <template #header>
        <div class="card-header">
          <span>今日课程</span>
          <el-button type="primary" text>查看全部</el-button>
        </div>
      </template>
      <el-table :data="todayCourses" style="width: 100%">
        <el-table-column prop="time" label="时间" width="120" />
        <el-table-column prop="subject" label="科目" width="120" />
        <el-table-column prop="coach" label="教练" width="100" />
        <el-table-column prop="students" label="学员" />
        <el-table-column prop="location" label="地点" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default>
            <el-button type="primary" text size="small">详情</el-button>
            <el-button type="success" text size="small">录入课时</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Calendar, Clock, User, Money } from '@element-plus/icons-vue'

// 模拟数据
const todayCourses = ref([
  { time: '09:00-10:00', subject: '篮球基础', coach: '张教练', students: '李明、王华', location: '篮球场A', status: '已完成' },
  { time: '10:30-11:30', subject: '钢琴一对一', coach: '李老师', students: '小红', location: '琴房1', status: '进行中' },
  { time: '14:00-15:00', subject: '足球训练', coach: '王教练', students: '赵强、刘洋、陈磊', location: '足球场', status: '待上课' },
  { time: '16:00-17:00', subject: '游泳提高', coach: '刘教练', students: '张伟', location: '游泳池', status: '待上课' },
])

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    '已完成': 'success',
    '进行中': 'warning',
    '待上课': 'info',
    '已取消': 'danger',
  }
  return map[status] || 'info'
}
</script>

<style scoped>
.dashboard h1 {
  margin-bottom: 20px;
}

.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 16px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.section-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
