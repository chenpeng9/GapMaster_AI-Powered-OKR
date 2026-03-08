# GapMaster

## What is GapMaster?

GapMaster is a tool that helps you manage goals and track progress. Based on the **OKR (Objectives and Key Results)** methodology, it enables you to:

1. **Set Objectives** - Write down what you want to achieve
2. **Break Down Key Results** - Split big goals into measurable smaller goals
3. **Daily Logging** - Write down what you did each day
4. **AI Analysis** - Artificial intelligence evaluates whether you're on track
5. **Multi-user Support** - Account login with isolated data management

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                         GapMaster Workflow                       │
└─────────────────────────────────────────────────────────────────┘

     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │  Set OKR │────▶│ Daily Log│────▶│ AI Score │
     │          │     │          │     │          │
     └──────────┘     └──────────┘     └──────────┘
                           │               │
                           ▼               ▼
                    ┌──────────┐     ┌──────────┐
                    │ View Prog│◀────│ Link KR  │
                    │          │     │          │
                    └──────────┘     └──────────┘
                           │
                           ▼
                    ┌──────────┐
                    │Analytics │
                    │          │
                    └──────────┘
```

---

## Core Features

### 1. Dashboard — Daily Workspace

The homepage you see when opening the app, with three main areas:

| Area | Function | Example |
|------|----------|---------|
| **Log Input** | Record what you did today | "Completed user interviews" |
| **AI Scoring** | AI evaluates your progress | "Related to KR1, Score 8/10" |
| **History** | View past logs and scores | Today's tasks → Yesterday's tasks |

### 2. OKR Strategy — Goal Management Center

Manage your objectives and key results here:

- **Objective (O)**: Big goal
  - Example: "Improve product UX"
- **Key Result (KR)**: Measurable sub-goal
  - Example: "Complete 10 user interviews" (out of 10)

```
Objective: Improve Product UX
├── KR1: Complete 10 user interviews (3/10) ████████░░
├── KR2: Optimize 5 core page load speeds (5/5) ██████████
└── KR3: Achieve 90% user satisfaction (not started) ░░░░░░░░░░░
```

### 3. Analytics — Progress Visualization

Visualize your OKR progress with charts:

- Completion percentage of each objective
- Weekly/monthly trend changes
- AI scoring history

---

## AI Scoring System (Core Feature)

GapMaster's standout feature is **AI Intelligent Audit**:

```
User inputs log
     │
     ▼
Call Google Gemini AI
     │
     ▼
AI Analysis:
├── 1. Determine which KR this log relates to
├── 2. Evaluate completion quality (0-10)
├── 3. Determine if "achieved" today
     │
     ▼
Update database + display results
     │
     ▼
If achieved, KR progress +1
```

### Example

Assume your KR is "Complete 10 user interviews", and you input:

> "Today I called 3 users and learned about their pain points"

**AI will automatically identify**:
- Related to KR1 (User Interviews)
- Progress score: 8 (good progress)
- Mark as "Achieved"
- KR progress changes from 3/10 to 4/10

---

## Technology Stack

| Layer | Technology | Description |
|-------|------------|-------------|
| Frontend | Next.js + React | The web interface |
| UI Components | shadcn/ui | Beautiful UI components |
| AI Engine | Google Gemini | Analyzes your logs |
| Database | Supabase | Stores goals, journals, progress |
| Deployment | Vercel | Web hosting |

---

## Data Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    User Action  │     │  Data Processing│     │    Data Storage │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ 1. Create OKR  │────▶│ 2. Save to DB   │     │ Supabase Cloud  │
│ 2. Daily Log   │────▶│ 3. AI Analysis  │     │ Stores:         │
│ 3. View Progress│◀────│ 4. Return Result │     │ - OKR Goals     │
│                  │     │                  │     │ - Daily Logs    │
└──────────────────┘     └──────────────────┘     │ - AI Scores     │
                                                     └──────────────────┘
```

---

## Page Structure

```
┌────────────────────────────────────────────────────────┐
│                        Menu                             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  [📊 Dashboard]    ← Daily logs & AI feedback        │
│                                                        │
│  [🎯 OKR Strategy] ← Manage and view goals           │
│                                                        │
│  [📈 Analytics]    ← Progress charts & stats         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Account & Security

GapMaster supports multi-user account system with data isolation between users.

### Authentication Features

| Feature | Description |
|---------|-------------|
| **Register** | Create new account |
| **Login** | Login with email and password |
| **Forgot Password** | Reset password via email |
| **Change Password** | Change password in settings |

### Page Routes

```
/login         - Login page
/register      - Registration page
/forgot-password  - Forgot password page
/reset-password   - Reset password page (via email link)
```

### Data Isolation

- Each user can only see their own OKRs and logs
- Protected by Supabase Row Level Security (RLS)

---

## Summary

GapMaster is an **AI-driven OKR management tool**:

1. **Set Goals** → Create objectives and key results in OKR Strategy
2. **Daily Logging** → Write your daily work in Dashboard
3. **AI Evaluation** → AI automatically analyzes and scores your progress
4. **View Progress** → Check completion in Analytics and OKR pages
5. **Continuous Improvement** → Adjust strategy based on AI feedback

Its core value: **Making goal management simpler and execution feedback smarter**.

---

# GapMaster 项目介绍

## 这是什么项目？

GapMaster 是一个帮助你管理目标和追踪进度的工具。它基于 **OKR（目标与关键结果）方法论**，让你可以：

1. **设定目标** - 写下你想达成的目标
2. **拆分关键结果** - 把大目标拆成具体可衡量的小目标
3. **每日记录** - 每天写下你做了什么
4. **AI 智能分析** - 人工智能帮你评估今天的进展是否在正确的轨道上
5. **多用户支持** - 支持账号登录，数据独立管理

---

## 业务流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                         GapMaster 业务流程                       │
└─────────────────────────────────────────────────────────────────┘

     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │ 设定目标  │────▶│ 每日记录  │────▶│ AI 评分  │
     │  (OKR)   │     │          │     │          │
     └──────────┘     └──────────┘     └──────────┘
                           │               │
                           ▼               ▼
                    ┌──────────┐     ┌──────────┐
                    │ 查看进度  │◀────│ 关联目标  │
                    │          │     │          │
                    └──────────┘     └──────────┘
                           │
                           ▼
                    ┌──────────┐
                    │ 数据分析  │
                    │          │
                    └──────────┘
```

---

## 核心功能模块

### 1. 仪表盘（Dashboard）—— 每日工作台

这是你每天打开应用看到的首页，包含三个主要区域：

| 区域 | 功能 | 举例 |
|------|------|------|
| **日志输入区** | 记录你今天做了什么 | "今天完成了用户访谈" |
| **AI 评分反馈** | AI 评估你的进展并打分 | "与 KR1 相关，得分 8/10" |
| **历史记录流** | 查看过去的日志和得分 | 今天的任务 → 昨天的任务 |

### 2. OKR 策略（OKR Strategy）—— 目标管理中心

在这里管理你的目标和关键结果：

- **Objective（O）**：大目标
  - 例如："提升产品用户体验"
- **Key Result（KR）**：关键结果（可衡量的小目标）
  - 例如："完成 10 次用户访谈"（共 10 次）

```
目标：提升产品用户体验
├── KR1: 完成 10 次用户访谈 (3/10) ████████░░
├── KR2: 优化 5 个核心页面加载速度 (5/5) ██████████
└── KR3: 用户满意度达到 90% (未开始) ░░░░░░░░░░░
```

### 3. 数据分析（Analytics）—— 进度可视化

用图表直观展示你的 OKR 进度：

- 各个目标的完成百分比
- 每周/每月的趋势变化
- AI 评分的历史走势

---

## AI 评分系统（核心特色）

GapMaster 的最大亮点是 **AI 智能审计**，流程如下：

```
用户输入日志
     │
     ▼
调用 Google Gemini AI
     │
     ▼
AI 分析内容：
├── 1. 判断这条日志关联哪个 KR
├── 2. 评估完成质量 (0-10分)
├── 3. 判断今天是否"达标"
     │
     ▼
更新数据库 + 显示结果
     │
     ▼
如果达标，KR 进度 +1
```

### 举例

假设你的 KR 是"完成 10 次用户访谈"，你今天输入：

> "今天和 3 个用户通了电话，了解了他们的痛点"

**AI 会自动识别**：
- 关联到 KR1（用户访谈）
- 评估进展：8 分（进展不错）
- 标记为"达标"
- KR 进度从 3/10 变成 4/10

---

## 技术架构（可选了解）

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端界面 | Next.js + React | 你看到的网页 |
| UI 组件 | shadcn/ui | 漂亮的界面组件 |
| AI 引擎 | Google Gemini | 负责分析你的日志 |
| 数据库 | Supabase | 存储你的目标、日记、进度 |
| 部署 | Vercel | 网页托管服务 |

---

## 数据流转总览

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    用户操作      │     │    数据处理      │     │    数据存储      │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ 1. 创建 OKR     │────▶│ 2. 保存到数据库  │     │ Supabase 云端    │
│ 2. 写每日日志   │────▶│ 3. AI 分析日志   │     │ 存储：           │
│ 3. 查看进度     │◀────│ 4. 返回评分结果  │     │ - OKR 目标        │
│                  │     │                  │     │ - 每日日志        │
└──────────────────┘     └──────────────────┘     │ - AI 评分记录    │
                                                     └──────────────────┘
```

---

## 页面结构

```
┌────────────────────────────────────────────────────────┐
│                        页面菜单                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  [📊 仪表盘]     ← 每日记录和 AI 反馈                   │
│                                                        │
│  [🎯 OKR策略]    ← 管理和查看目标                      │
│                                                        │
│  [📈 数据分析]   ← 进度图表和统计                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 账号与安全

GapMaster 支持多用户账号系统，每个用户的数据相互隔离。

### 登录相关功能

| 功能 | 说明 |
|------|------|
| **注册** | 创建新账号 |
| **登录** | 使用邮箱和密码登录 |
| **忘记密码** | 通过邮件重置密码 |
| **修改密码** | 在设置中修改当前密码 |

### 页面入口

```
/login         - 登录页
/register      - 注册页
/forgot-password  - 忘记密码页
/reset-password   - 重置密码页（邮件链接）
```

### 数据隔离

- 每个用户只能看到自己的 OKR 和日志
- 使用 Supabase Row Level Security (RLS) 保护数据安全

---

## 总结

GapMaster 是一个 **AI 驱动的 OKR 管理工具**：

1. **设定目标** → 在 OKR 策略页面创建你的目标和关键结果
2. **每日记录** → 在仪表盘写下你每天的工作内容
3. **AI 评估** → 人工智能自动分析你的进展并打分
4. **查看进度** → 在数据分析和 OKR 页面查看完成情况
5. **持续改进** → 根据 AI 反馈调整你的执行策略

它的核心价值是：**让目标管理变得更简单，让执行反馈变得更智能**。
