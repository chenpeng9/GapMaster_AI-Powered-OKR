# GapMaster

> **[简体中文](README_CN.md)** | English

AI-Powered OKR (Objectives and Key Results) Management Application. Helps users set goals, track daily progress through logs, and receive AI-generated feedback on their execution.

---

## Features

- **OKR Management** - Create and manage Objectives and Key Results
- **Daily Logging** - Record your daily progress with AI-powered scoring (0-10)
- **AI Scoring** - DeepSeek AI analyzes your logs and provides execution scores
- **Weekly Insights** - AI-generated weekly execution analysis with actionable recommendations
- **Multi-user Support** - Secure authentication with Supabase
- **Data Analytics** - Visualize your OKR progress with charts
- **History View** - View and analyze data by week with version tracking
- **Daily Reminder** - Automatic webhook notifications when you forget to log
- **Usage Limits** - 5 log submissions/day, 1 AI insight/day per user

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm / bun
- Supabase account
- DeepSeek API key

### Environment Variables

Create a `.env.local` file with:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm run start
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **AI**: DeepSeek (deepseek-chat model)
- **Deployment**: Vercel / Zeabur

---

## Project Structure

```
src/
├── app/               # Next.js pages and API routes
│   ├── login/        # Login page
│   ├── register/     # Registration page
│   ├── forgot-password/  # Password reset request
│   ├── reset-password/   # Password reset page
│   └── api/          # API routes
│       ├── judge/                    # AI scoring endpoint
│       ├── weekly-insights/          # AI weekly insights
│       └── wechat/                 # WeChat article generation
├── components/        # React components
│   ├── DashboardView.tsx           # Main dashboard with daily logging
│   ├── OKRStrategyView.tsx          # OKR management interface
│   ├── AnalyticsView.tsx            # Data analytics & insights
│   └── ui/                         # shadcn/ui components
├── contexts/         # React contexts
│   └── AuthContext.tsx              # Authentication context
└── lib/              # Utilities
    ├── supabase.ts                 # Supabase client
    └── auth.ts                    # Auth utilities
scripts/                # SQL migration scripts
```

---

## Authentication

The app uses Supabase Auth with email/password authentication:

- **Login**: `/login`
- **Register**: `/register`
- **Forgot Password**: `/forgot-password`
- **Reset Password**: `/reset-password` (via email link)
- **Change Password**: Available in main dashboard (settings icon)

### Database Setup

Run SQL scripts in Supabase Dashboard -> SQL Editor:

1. `scripts/database-setup.sql` - Configure user ID columns and RLS policies
2. `scripts/add-user-settings.sql` - Add user settings table
3. `scripts/add-weekly-insights.sql` - Add weekly insights table
4. `scripts/add-daily-limits.sql` - Add daily usage limit columns

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

---

## Daily Usage Limits

To prevent abuse and maintain data quality, the following limits are enforced:

- **Daily Logs**: 5 submissions per user per day
- **AI Insights**: 1 generation per user per day

Limits reset at midnight. Users see friendly messages when limits are reached.

---

## Weekly Insights

The AI analyzes your weekly execution and provides:

1. **Execution Summary** - Quality analysis of your logs and performance
2. **OKR Progress Analysis** - Detailed progress on each Key Result
3. **Action Steps** - 3-5 specific, actionable recommendations

### Features

- **Week Selector** - View insights for any historical week
- **Version History** - Track multiple generations per week
- **Context Awareness** - Uses last week's data for better recommendations

---

## Daily Reminder Setup

The daily reminder feature sends webhook notifications when users forget to log their progress.

### 1. Database Changes

Run `scripts/add-reminder-settings.sql` in Supabase SQL Editor.

### 2. Install Supabase CLI

```bash
brew install supabase/tap/supabase
```

### 3. Deploy Edge Function

```bash
supabase login
supabase link --project-ref your_project_ref
supabase functions deploy daily-reminder
```

### 4. Configure Environment Variables

In Supabase Dashboard > Settings > Edge Functions, add:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://your_project_ref.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `CRON_SECRET` | Random string (generate with `openssl rand -base64 32`) |

### 5. Configure pg_cron

Run `scripts/setup-pg-cron.sql` in Supabase SQL Editor. Replace `YOUR_CRON_SECRET` with value from step 4.

### 6. User Configuration

Users can enable reminders in app:
1. Click settings icon (⚙️)
2. Toggle "Daily Reminder"
3. Enter webhook URL (WeChat Work, DingTalk, Feishu, etc.)
4. Select reminder time

### Supported Webhooks

- **WeChat Work (企业微信)**: `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`
- **DingTalk (钉钉)**: `https://oapi.dingtalk.com/robot/send?access_token=xxx`
- **Feishu (飞书)**: `https://open.feishu.cn/open-apis/bot/v2/hook/xxx`

---

## API

### POST /api/judge

AI scoring endpoint that analyzes daily logs against OKRs.

**Request:**
```json
{
  "content": "Today I completed 3 user interviews",
  "objectives": [...]
}
```

**Response:**
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

Get the latest AI insight for a specific week.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
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

Generate a new AI insight for a specific week.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
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

**Response:**
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

Get all versions of insights for a specific week.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
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

## Security

- **Authentication**: All API endpoints require valid Bearer token
- **Row Level Security**: All database tables have RLS policies enabled
- **Data Isolation**: Users can only access their own data
- **Input Validation**: API endpoints validate input parameters
- **Rate Limiting**: Daily limits prevent abuse

---

## License

MIT
