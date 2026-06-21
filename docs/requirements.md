# 俱乐部课时系统 - 产品需求文档 (PRD)

## 一、项目概述

### 1.1 项目背景
为培训机构/俱乐部提供一套完整的课时管理系统，支持一对一和一对多授课模式，实现排课、记录、统计的全流程管理。

### 1.2 目标用户
- 系统管理员（平台运营方）
- 俱乐部管理员（入驻的培训机构）
- 教练/老师（授课人员）
- 学生（被授课对象）

### 1.3 核心价值
- 规范化管理授课流程
- 自动化计算课时费用
- 多维度统计报表
- 提升管理效率，减少人工统计错误

---

## 二、用户角色与权限

| 角色 | 说明 | 核心权限 |
|------|------|----------|
| **系统管理员** | 平台超级管理员 | 全部权限，管理俱乐部、用户、系统配置 |
| **俱乐部管理员** | 俱乐部负责人 | 管理本俱乐部的教练、排课、费用结算 |
| **教练/老师** | 授课人员 | 查看自己的排课、记录课时、查看学生信息 |

> **说明**：学员不直接使用系统，学员信息由教练/管理员录入和管理。

---

## 三、功能模块

### 3.1 用户管理模块

#### 3.1.1 用户注册/登录
- 支持手机号 + 验证码登录
- 支持微信扫码登录（可选）
- 支持账号密码登录（管理员）

#### 3.1.2 用户信息管理
- 基本信息：姓名、手机号、头像、性别、出生日期
- 角色分配：由上级角色创建并分配
- 状态管理：启用/禁用

#### 3.1.3 组织架构
```
系统管理员
├── 俱乐部A管理员
│   ├── 教练1
│   │   └── 学生A、学生B、学生C
│   └── 教练2
│       └── 学生D、学生E
└── 俱乐部B管理员
    └── ...
```

### 3.2 俱乐部管理模块

#### 3.2.1 俱乐部信息
- 俱乐部名称、简介、联系方式
- 地址、营业时间
- Logo、封面图

#### 3.2.2 俱乐部配置
- 课时费默认单价
- 课程类别设置（篮球、足球、游泳、钢琴等）
- 结算周期设置

### 3.3 课程科目管理

#### 3.3.1 科目设置
- 科目名称（如：篮球基础班、钢琴一对一）
- 授课方式：一对一 / 一对多（小班课）
- 标准课时长度（分钟）
- 标准课时费用

#### 3.3.2 科目分类
- 按运动/学科类型分组
- 按难度等级分组

### 3.4 排课管理模块

#### 3.4.1 创建课程
| 字段 | 说明 | 必填 |
|------|------|------|
| 课程科目 | 选择科目 | ✅ |
| 授课教练 | 选择教练 | ✅ |
| 授课方式 | 一对一/一对多 | ✅ |
| 上课时间 | 日期 + 开始时间 + 结束时间 | ✅ |
| 上课地点 | 场地/教室 | ✅ |
| 参与学生 | 一对一选1人，一对多多选 | ✅ |
| 课程备注 | 特殊说明 | ❌ |

#### 3.4.2 排课日历
- 日视图：查看当天课程安排
- 周视图：查看一周课程安排
- 月视图：查看整月课程安排
- 支持按教练、科目筛选

#### 3.4.3 冲突检测
- 同一学生同一时段不能有重复课程
- 同一教练同一时段不能有重复课程
- 同一场地同一时段不能有重复课程

### 3.5 课时记录模块

#### 3.5.1 课时录入
| 字段 | 说明 |
|------|------|
| 关联课程 | 选择已有排课 |
| 实际开始时间 | 精确到分钟 |
| 实际结束时间 | 精确到分钟 |
| 实际时长 | 自动计算，可手动调整 |
| 课程内容 | 本次课的教学内容 |
| 学生表现 | 简要评价 |
| 课后作业 | 布置的作业（可选） |

#### 3.5.2 课时状态
- **待上课**：已排课，尚未开始
- **进行中**：课程进行中
- **已完成**：已记录课时
- **已取消**：课程取消

#### 3.5.3 快速记录
- 支持从排课列表一键录入
- 支持批量录入（一对多课程）

### 3.6 课时统计模块

#### 3.6.1 个人维度统计
**学生视角：**
- 本月/本学期/自定义时间段的上课总时长
- 各科目课时分布
- 剩余课时/剩余费用
- 课时消费明细

**教练视角：**
- 本月/本季度/自定义时间段的授课总时长
- 各科目授课分布
- 各学生授课明细
- 应得课时费汇总

#### 3.6.2 俱乐部维度统计
- 按教练统计：每位教练的授课时长、课时费
- 按科目统计：各科目的总课时、总费用、学生数
- 按时间段统计：日/周/月/季度/年度趋势
- 热力图：哪天/哪个时段最忙

#### 3.6.3 财务统计
- 课时费收入汇总
- 按教练的课时费支出
- 待结算金额
- 历史结算记录

### 3.7 费用结算模块

#### 3.7.1 课时费计算规则
```
课时费 = 课时数量 × 单价 × 折扣比例

其中：
- 课时数量 = 实际授课时长 / 标准课时长度（向上取整）
- 单价 = 科目标准单价 或 特殊约定单价
- 折扣比例 = 根据套餐/活动确定
```

#### 3.7.2 结算方式
- **按课时结算**：上一节课结一次
- **按月结算**：每月固定日期汇总结算
- **按套餐结算**：购买课时包，扣减课时

#### 3.7.3 结算单生成
- 支持导出PDF/Excel
- 包含：教练信息、学生信息、课程明细、课时费小计

### 3.8 消息通知模块

#### 3.8.1 系统通知
- 课程提醒（课前1小时/24小时）
- 课时录入成功通知
- 结算完成通知

#### 3.8.2 通知渠道
- 站内消息
- 微信服务号模板消息（可选）
- 短信通知（可选）

---

## 四、数据模型设计

### 4.1 核心实体关系

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   用户表     │────<│  俱乐部成员  │>────│  俱乐部表    │
│   (User)    │     │ (ClubMember)│     │  (Club)     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                         │
       │                                    ┌────┴────┐
       │                                    v         v
       │                              ┌─────────┐ ┌─────────┐
       │                              │  校区表  │ │  科目表  │
       │                              │(Campus) │ │(Subject)│
       │                              └────┬────┘ └────┬────┘
       │                                   │           │
       v                                   v           v
┌─────────────┐     ┌─────────────────────────────────────┐
│  课时记录表  │>────│           课程表 (Course)            │
│  (Lesson)   │     └─────────────────────────────────────┘
└─────────────┘
       │
       v
┌─────────────┐
│  费用结算表  │
│ (Settlement)│
└─────────────┘
```

### 4.2 表结构设计

#### 用户表 (users)
```sql
CREATE TABLE users (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone           VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
    name            VARCHAR(50) NOT NULL COMMENT '姓名',
    avatar          VARCHAR(255) COMMENT '头像URL',
    gender          TINYINT COMMENT '性别：0未知 1男 2女',
    birth_date      DATE COMMENT '出生日期',
    password_hash   VARCHAR(255) COMMENT '密码哈希',
    role            VARCHAR(20) NOT NULL COMMENT '角色：super_admin/club_admin/coach/student',
    status          TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_auths (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL,
    auth_type       VARCHAR(20) NOT NULL COMMENT '认证类型：wechat/normal',
    auth_id         VARCHAR(255) NOT NULL COMMENT '第三方ID',
    auth_token      VARCHAR(255) COMMENT '令牌',
    UNIQUE KEY (auth_type, auth_id)
);
```

#### 俱乐部表 (clubs)
```sql
CREATE TABLE clubs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL COMMENT '俱乐部名称',
    description     TEXT COMMENT '俱乐部简介',
    logo            VARCHAR(255) COMMENT 'Logo URL',
    cover_image     VARCHAR(255) COMMENT '封面图URL',
    phone           VARCHAR(20) COMMENT '联系电话',
    address         VARCHAR(255) COMMENT '总部地址',
    business_hours  VARCHAR(100) COMMENT '营业时间',
    admin_id        BIGINT NOT NULL COMMENT '管理员ID',
    status          TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 校区表 (campuses)
```sql
CREATE TABLE campuses (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    club_id         BIGINT NOT NULL COMMENT '所属俱乐部',
    name            VARCHAR(100) NOT NULL COMMENT '校区名称',
    address         VARCHAR(255) NOT NULL COMMENT '校区地址',
    phone           VARCHAR(20) COMMENT '联系电话',
    business_hours  VARCHAR(100) COMMENT '营业时间',
    status          TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_club (club_id)
);
```

#### 俱乐部成员表 (club_members)
```sql
CREATE TABLE club_members (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    club_id         BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    role            VARCHAR(20) NOT NULL COMMENT '角色：admin/coach/student',
    joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (club_id, user_id)
);
```

#### 科目表 (subjects)
```sql
CREATE TABLE subjects (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    club_id         BIGINT NOT NULL COMMENT '所属俱乐部',
    name            VARCHAR(100) NOT NULL COMMENT '科目名称',
    category        VARCHAR(50) COMMENT '分类：篮球/足球/钢琴等',
    teaching_mode   VARCHAR(20) NOT NULL COMMENT '授课方式：private/group',
    duration_minutes INT NOT NULL DEFAULT 60 COMMENT '标准课时长度(分钟)',
    price           DECIMAL(10,2) NOT NULL COMMENT '标准课时单价',
    description     TEXT COMMENT '科目描述',
    status          TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 课程表 (courses)
```sql
CREATE TABLE courses (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    club_id         BIGINT NOT NULL,
    campus_id       BIGINT COMMENT '校区ID，支持多校区',
    subject_id      BIGINT NOT NULL,
    coach_id        BIGINT NOT NULL COMMENT '教练ID',
    teaching_mode   VARCHAR(20) NOT NULL COMMENT '授课方式：private/group',
    scheduled_date  DATE NOT NULL COMMENT '上课日期',
    start_time      TIME NOT NULL COMMENT '开始时间',
    end_time        TIME NOT NULL COMMENT '结束时间',
    location        VARCHAR(100) COMMENT '上课地点（具体教室/场地）',
    status          VARCHAR(20) DEFAULT 'scheduled' COMMENT '状态：scheduled/in_progress/completed/cancelled',
    remark          TEXT COMMENT '备注',
    created_by      BIGINT NOT NULL COMMENT '创建人',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_coach_time (coach_id, scheduled_date, start_time),
    INDEX idx_club_date (club_id, scheduled_date),
    INDEX idx_campus (campus_id, scheduled_date)
);
```

#### 课程学生关联表 (course_students)
```sql
CREATE TABLE course_students (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    UNIQUE KEY (course_id, student_id)
);
```

#### 课时记录表 (lessons)
```sql
CREATE TABLE lessons (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id       BIGINT NOT NULL COMMENT '关联课程',
    student_id      BIGINT NOT NULL COMMENT '学生ID',
    coach_id        BIGINT NOT NULL COMMENT '教练ID',
    actual_start    DATETIME COMMENT '实际开始时间',
    actual_end      DATETIME COMMENT '实际结束时间',
    duration_minutes INT COMMENT '实际时长(分钟)',
    content         TEXT COMMENT '课程内容',
    performance     TEXT COMMENT '学生表现',
    homework        TEXT COMMENT '课后作业',
    status          VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending/confirmed/cancelled',
    confirmed_at    DATETIME COMMENT '确认时间',
    confirmed_by    BIGINT COMMENT '确认人',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student (student_id, created_at),
    INDEX idx_coach (coach_id, created_at)
);
```

#### 费用结算表 (settlements)
```sql
CREATE TABLE settlements (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    club_id         BIGINT NOT NULL,
    coach_id        BIGINT NOT NULL,
    period_start    DATE NOT NULL COMMENT '结算周期开始',
    period_end      DATE NOT NULL COMMENT '结算周期结束',
    total_lessons   INT NOT NULL COMMENT '总课时数',
    total_minutes   INT NOT NULL COMMENT '总时长(分钟)',
    total_amount    DECIMAL(10,2) NOT NULL COMMENT '总结算金额',
    status          VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending/paid/cancelled',
    paid_at         DATETIME COMMENT '支付时间',
    paid_amount     DECIMAL(10,2) COMMENT '实付金额',
    remark          TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_coach_period (coach_id, period_start)
);
```

#### 结算明细表 (settlement_items)
```sql
CREATE TABLE settlement_items (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    settlement_id   BIGINT NOT NULL,
    lesson_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    subject_id      BIGINT NOT NULL,
    duration_minutes INT NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    INDEX idx_settlement (settlement_id)
);
```

---

## 五、页面设计

### 5.1 页面结构

```
├── 登录页
├── 首页（仪表盘）
├── 用户管理
│   ├── 用户列表
│   └── 用户详情/编辑
├── 俱乐部管理
│   ├── 俱乐部列表
│   ├── 俱乐部详情
│   └── 俱乐部设置
├── 科目管理
│   ├── 科目列表
│   └── 科目编辑
├── 排课管理
│   ├── 排课日历
│   ├── 新建排课
│   └── 排课详情
├── 课时记录
│   ├── 课时列表
│   ├── 录入课时
│   └── 课时详情
├── 统计报表
│   ├── 教练统计
│   ├── 学生统计
│   ├── 科目统计
│   └── 财务统计
├── 费用结算
│   ├── 结算列表
│   ├── 结算详情
│   └── 结算单导出
└── 个人中心
    ├── 基本信息
    └── 我的课程
```

### 5.2 核心页面设计

#### 5.2.1 排课日历页
```
┌─────────────────────────────────────────────────────────────┐
│  排课日历                              [新建课程] [批量排课] │
├─────────────────────────────────────────────────────────────┤
│  筛选：[全部教练 ▼] [全部科目 ▼] [授课方式 ▼]              │
├─────────────────────────────────────────────────────────────┤
│  2024年1月 第3周                          < 上周 下周 >     │
├───────┬───────┬───────┬───────┬───────┬───────┬───────┤
│  周一  │  周二  │  周三  │  周四  │  周五  │  周六  │  周日  │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│ 15    │ 16    │ 17    │ 18    │ 19    │ 20    │ 21    │
│       │       │       │       │       │ 09:00 │ 09:00 │
│       │       │       │       │       │ 篮球🏀 │ 钢琴🎹 │
│       │       │       │       │       │ 张教练 │ 李老师 │
│       │       │       │       │       │ 3人    │ 小明   │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┘
```

#### 5.2.2 课时统计页（教练视角）
```
┌─────────────────────────────────────────────────────────────┐
│  我的课时统计                                                │
├─────────────────────────────────────────────────────────────┤
│  时间范围：[本月 ▼]  科目：[全部 ▼]                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  总课时      │ │  总时长      │ │  应得费用    │           │
│  │    48节      │ │  36小时      │ │  ¥7,200     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  科目分布                                                   │
│  篮球 ████████████████░░░░ 65%  31节                        │
│  足球 █████░░░░░░░░░░░░░░░ 20%  10节                        │
│  其他 ███░░░░░░░░░░░░░░░░░ 15%   7节                        │
├─────────────────────────────────────────────────────────────┤
│  课时明细                                                   │
│  日期        科目    学生      时长    状态                   │
│  2024-01-15  篮球    张三      60min   已完成                 │
│  2024-01-15  篮球    李四      60min   已完成                 │
│  2024-01-16  足球    王五      90min   已完成                 │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、技术选型建议

### 6.1 前端
- **框架**：Vue 3 + TypeScript
- **UI库**：Element Plus / Ant Design Vue
- **日历组件**：FullCalendar
- **图表**：ECharts
- **构建工具**：Vite

### 6.2 后端
- **框架**：Node.js + Express / NestJS 或 Python + FastAPI
- **ORM**：Prisma / TypeORM / SQLAlchemy
- **数据库**：MySQL 8.0 / PostgreSQL
- **缓存**：Redis（会话、统计数据缓存）

### 6.3 部署
- **容器化**：Docker + Docker Compose
- **反向代理**：Nginx
- **文件存储**：阿里云OSS / MinIO（本地开发）

---

## 七、开发计划（建议）

### Phase 1：基础功能（MVP）
- [ ] 用户认证（登录/注册）
- [ ] 俱乐部管理
- [ ] 校区管理（多校区支持）
- [ ] 教练/老师管理
- [ ] 学员管理（仅录入，学员不使用系统）
- [ ] 科目管理
- [ ] 基础排课功能
- [ ] 课时记录

### Phase 2：统计功能
- [ ] 教练维度统计
- [ ] 科目维度统计
- [ ] 校区维度统计

### Phase 3：财务功能
- [ ] 课时费计算（后续讨论规则）
- [ ] 结算管理
- [ ] 报表导出

### Phase 4：高级功能
- [ ] 消息通知
- [ ] 微信集成
- [ ] 数据分析仪表盘
- [ ] 小程序开发（预留接口）

---

## 八、已确认事项

| 问题 | 决定 | 备注 |
|------|------|------|
| 课时费计费规则 | 后续讨论 | MVP阶段先做基础功能 |
| 退课/补课 | 暂不考虑 | 学员不直接使用系统 |
| 预约机制 | 暂不考虑 | 教练统一排课 |
| 考勤签到 | 暂不考虑 | |
| 多校区 | **需要支持** | 一个俱乐部可有多个校区 |
| 小程序/APP | 需要但暂不开发 | 先做Web端，预留接口 |
| 学生端 | 暂不考虑 | 学生不直接使用系统 |

---

## 九、竞品参考

- **校管家**：教培行业管理软件
- **小麦助教**：培训机构管理系统
- ** ClassPass**：健身课程预约平台
- **Mindbody**：健身/瑜伽工作室管理软件

---

*文档版本：v1.0*
*创建日期：2024-01-20*
*最后更新：2024-01-20*
