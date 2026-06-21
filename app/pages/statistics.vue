<template>
  <div class="statistics-page">
    <el-row :gutter="20">
      <!-- 左侧统计 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>课时统计</span>
              <div class="header-filters">
                <el-select v-model="filters.period" placeholder="时间范围" style="width: 120px">
                  <el-option label="本月" value="month" />
                  <el-option label="本季度" value="quarter" />
                  <el-option label="本年" value="year" />
                  <el-option label="自定义" value="custom" />
                </el-select>
                <el-select v-model="filters.coachId" placeholder="教练" clearable style="width: 120px">
                  <el-option label="全部教练" :value="null" />
                  <el-option label="张教练" :value="1" />
                  <el-option label="李老师" :value="2" />
                  <el-option label="王教练" :value="3" />
                </el-select>
                <el-select v-model="filters.subjectId" placeholder="科目" clearable style="width: 120px">
                  <el-option label="全部科目" :value="null" />
                  <el-option label="篮球基础" :value="1" />
                  <el-option label="钢琴一对一" :value="2" />
                  <el-option label="足球训练" :value="3" />
                </el-select>
              </div>
            </div>
          </template>

          <!-- 图表 -->
          <div class="chart-container">
            <div ref="barChartRef" class="chart"></div>
          </div>
        </el-card>

        <!-- 明细表格 -->
        <el-card style="margin-top: 20px">
          <template #header>
            <span>课时明细</span>
          </template>
          <el-table :data="lessonDetails" style="width: 100%">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="coach" label="教练" width="100" />
            <el-table-column prop="subject" label="科目" width="120" />
            <el-table-column prop="student" label="学员" width="100" />
            <el-table-column prop="duration" label="时长" width="80">
              <template #default="{ row }">
                {{ row.duration }}分钟
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="费用" width="100">
              <template #default="{ row }">
                ¥{{ row.amount }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧统计 -->
      <el-col :span="8">
        <!-- 汇总卡片 -->
        <el-card class="summary-card">
          <div class="summary-item">
            <div class="summary-value">48</div>
            <div class="summary-label">总课时</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">36小时</div>
            <div class="summary-label">总时长</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">¥7,200</div>
            <div class="summary-label">总费用</div>
          </div>
        </el-card>

        <!-- 科目分布 -->
        <el-card style="margin-top: 20px">
          <template #header>
            <span>科目分布</span>
          </template>
          <div ref="pieChartRef" class="chart"></div>
        </el-card>

        <!-- 教练排名 -->
        <el-card style="margin-top: 20px">
          <template #header>
            <span>教练排名</span>
          </template>
          <div class="rank-list">
            <div class="rank-item" v-for="(item, index) in coachRanking" :key="item.id">
              <div class="rank-number" :class="{ 'top-three': index < 3 }">{{ index + 1 }}</div>
              <div class="rank-info">
                <div class="rank-name">{{ item.name }}</div>
                <div class="rank-value">{{ item.lessons }}课时 / {{ item.hours }}小时</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
// 筛选条件
const filters = ref({
  period: 'month',
  coachId: null,
  subjectId: null,
})

// 图表引用
const barChartRef = ref(null)
const pieChartRef = ref(null)

// 明细数据
const lessonDetails = ref([
  { date: '2024-01-15', coach: '张教练', subject: '篮球基础', student: '李明', duration: 60, amount: 150 },
  { date: '2024-01-15', coach: '李老师', subject: '钢琴一对一', student: '小红', duration: 60, amount: 200 },
  { date: '2024-01-16', coach: '王教练', subject: '足球训练', student: '赵强', duration: 60, amount: 120 },
  { date: '2024-01-16', coach: '张教练', subject: '篮球基础', student: '王华', duration: 60, amount: 150 },
])

// 教练排名
const coachRanking = ref([
  { id: 1, name: '张教练', lessons: 24, hours: 18 },
  { id: 2, name: '李老师', lessons: 16, hours: 12 },
  { id: 3, name: '王教练', lessons: 8, hours: 6 },
])

onMounted(() => {
  // TODO: 初始化 ECharts 图表
  // initCharts()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-filters {
  display: flex;
  gap: 8px;
}

.chart-container {
  height: 300px;
}

.chart {
  width: 100%;
  height: 100%;
}

.summary-card {
  text-align: center;
}

.summary-item {
  padding: 20px 0;
  border-bottom: 1px solid #ebeef5;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-value {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
}

.summary-label {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}

.rank-list {
  padding: 0;
}

.rank-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.rank-item:last-child {
  border-bottom: none;
}

.rank-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ebeef5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-right: 12px;
}

.rank-number.top-three {
  background: #409eff;
  color: white;
}

.rank-info {
  flex: 1;
}

.rank-name {
  font-weight: bold;
}

.rank-value {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
