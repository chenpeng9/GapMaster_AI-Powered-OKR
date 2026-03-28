# GapMaster

基于 AI 的 OKR（目标与关键结果）管理应用。帮助用户设定目标、通过日志追踪每日进度，并接收 AI 生成的执行反馈。

---

## 功能特性

- **OKR 管理** - 创建和管理目标与关键结果
- **每日记录** - 记录你的每日进度并获取 AI 评分（0-10 分）
- **AI 评分** - DeepSeek AI 分析你的日志并提供执行分数
- **每周洞察** - AI 生成的每周执行分析，包含可执行建议
- **多用户支持** - 基于 Supabase 的安全认证
- **数据分析** - 通过图表可视化你的 OKR 进度
- **历史回顾** - 按周查看和分析数据，支持版本追踪
- **每日提醒** - 当你忘记打卡时自动发送 Webhook 通知
- **使用限制** - 每人每天 5 次日志提交、1 次 AI 洞察生成

---

## 快速开始

### 前置要求

- Node.js 18+
- npm / yarn / pnpm / bun
- Supabase 账号
- DeepSeek API Key

### 环境变量

创建 `.env.local` 文件：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

在浏览器打开 [http://localhost:3000](http://localhost:3000)。

### 生产构建

```bash
npm run build
npm run start
```

---

## 技术栈

- **框架**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui
- **数据库**: Supabase (PostgreSQL) + 行级安全策略 (RLS)
- **AI**: DeepSeek (deepseek-chat 模型)
- **部署**: Vercel / Zeabur

---

## 项目结构

```
src/
├── app/               # Next.js 页面和 API 路由
│   ├── login/        # 登录页面
│   ├── register/     # 注册页面
│   ├── forgot-password/  # 忘记密码
│   ├── reset-password/   # 重置密码
│   └── api/          # API 路由
│       ├── judge/                    # AI 评分接口
│       ├── weekly-insights/          # AI 每周洞察
│       └── wechat/                 # 微信公众号文章生成
├── components/        # React 组件
│   ├── DashboardView.tsx           # 主面板，支持每日打卡
│   ├── OKRStrategyView.tsx          # OKR 管理界面
│   ├── AnalyticsView.tsx            # 数据分析 & 洞察
│   └── ui/                         # shadcn/ui 组件
├── contexts/         # React Context
│   └── AuthContext.tsx              # 认证上下文
└── lib/              # 工具库
    ├── supabase.ts                 # Supabase 客户端
    └── auth.ts                    # 认证工具
scripts/                # SQL 迁移脚本
```

---

## 认证

应用使用 Supabase Auth 进行邮箱密码认证：

- **登录**: `/login`
- **注册**: `/register`
- **忘记密码**: `/forgot-password`
- **重置密码**: `/reset-password` (通过邮件链接)
- **修改密码**: 主面板中可用（设置图标）

### 数据库配置

在 Supabase Dashboard -> SQL Editor 中运行 SQL 脚本：

1. `scripts/database-setup.sql` - 配置用户 ID 列和 RLS 策略
2. `scripts/add-user-settings.sql` - 添加用户设置表
3. `scripts/add-weekly-insights.sql` - 添加每周洞察表
4. `scripts/add-daily-limits.sql` - 添加每日使用限制列

所有表都启用了行级安全策略 (RLS)，确保用户只能访问自己的数据。

---

## 每日使用限制

为防止滥用并保持数据质量，系统执行以下限制：

- **每日日志**: 每用户每天最多提交 5 次
- **AI 洞察**: 每用户每天最多生成 1 次

限制在午夜重置。用户达到限制时会看到友好的提示信息。

---

## 每周洞察

AI 分析你的每周执行情况，提供以下内容：

1. **执行总结** - 日志质量和绩效分析
2. **OKR 进度分析** - 每个关键结果的详细进度
3. **行动建议** - 3-5 条具体、可执行的建议

### 功能特性

- **周选择器** - 查看任意历史周的洞察
- **版本历史** - 跟踪每周多次生成的记录
- **上下文感知** - 参考上周数据给出更好的建议

---

## 每日提醒配置

每日提醒功能会在你忘记记录进度时发送 Webhook 通知。

### 1. 数据库更改

在 Supabase SQL Editor 中运行 `scripts/add-reminder-settings.sql`。

### 2. 安装 Supabase CLI

```bash
brew install supabase/tap/supabase
```

### 3. 部署 Edge Function

```bash
supabase login
supabase link --project-ref your_project_ref
supabase functions deploy daily-reminder
```

### 4. 配置环境变量

在 Supabase Dashboard > Settings > Edge Functions 中添加：

| 变量 | 值 |
|----------|-------|
| `SUPABASE_URL` | `https://your_project_ref.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | 你的 service role key |
| `CRON_SECRET` | 随机字符串（生成命令：`openssl rand -base64 32`）|

### 5. 配置 pg_cron

在 Supabase SQL Editor 中运行 `scripts/setup-pg-cron.sql`。将 `YOUR_CRON_SECRET` 替换为第 4 步的值。

### 6. 用户配置

用户可以在应用中启用提醒：
1. 点击设置图标 (⚙️)
2. 开启"每日提醒"
3. 输入 Webhook URL（企业微信、钉钉、飞书等）
4. 选择提醒时间

### 支持的 Webhook

- **企业微信**: `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`
- **钉钉**: `https://oapi.dingtalk.com/robot/send?access_token=xxx`
- **飞书**: `https://open.feishu.cn/open-apis/bot/v2/hook/xxx`

---

## API

### POST /api/judge

AI 评分接口，分析每日日志与 OKR 的关联。

**请求：**
```json
{
  "content": "今天完成了3个用户访谈",
  "objectives": [...]
}
```

**响应：**
```json
{
  "score": 8,
  "category": "实质交付",
  "analysis": "...",
  "primary_kr_id": 1,
  "achieved_kr_ids": [1],
  "next_step": "..."
}
```

### GET /api/weekly-insights?week=2026-03-22

获取指定周的最新 AI 洞察。

**请求头：**
```
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "id": 1,
  "user_id": "...",
  "week_start": "2026-03-22",
  "week_end": "2026-03-28",
  "version": 1,
  "summary": "本周执行总结...",
  "okr_progress": "OKR进度分析...",
  "next_steps": "1. 建议1\n2. 建议2",
  "total_logs": 10,
  "avg_score": 7.5,
  "execution_rate": 80,
  "active_days": 5
}
```

### POST /api/weekly-insights

为指定周生成新的 AI 洞察。

**请求头：**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求：**
```json
{
  "week_start": "2026-03-22",
  "week_logs": [...],
  "objectives": [...],
  "stats": {
    "totalLogs": 10,
    "avgScore": 7.5,
    "executionRate": 80,
    "activeDays": 5
  }
}
```

**响应：**
```json
{
  "id": 1,
  "week_start": "2026-03-22",
  "week_end": "2026-03-28",
  "version": 1,
  "summary": "本周执行总结...",
  "okr_progress": "OKR进度分析...",
  "next_steps": "1. 建议1\n2. 建议2",
  ...
}
```

### GET /api/weekly-insights/versions?week=2026-03-22

获取指定周的所有洞察版本。

**请求头：**
```
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "versions": [
    {
      "id": 1,
      "version": 1,
      "summary": "...",
      ...
    },
    {
      "id": 2,
      "version": 2,
      "summary": "...",
      ...
    }
  ]
}
```

---

## 安全性

- **认证**: 所有 API 端点都需要有效的 Bearer token
- **行级安全**: 所有数据库表都启用了 RLS 策略
- **数据隔离**: 用户只能访问自己的数据
- **输入验证**: API 端点验证输入参数
- **速率限制**: 每日限制防止滥用

---

## 开源协议

MIT
