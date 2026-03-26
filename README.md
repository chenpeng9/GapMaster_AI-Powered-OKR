# GapMaster

AI-Powered OKR (Objectives and Key Results) Management Application. Helps users set goals, track daily progress through logs, and receive AI-generated feedback on their execution.

---

## Features

- **OKR Management** - Create and manage Objectives and Key Results
- **Daily Logging** - Record your daily progress
- **AI Scoring** - DeepSeek AI analyzes your logs and provides scores (0-10)
- **Multi-user Support** - Secure authentication with Supabase
- **Data Analytics** - Visualize your OKR progress with charts
- **Daily Reminder** - Automatic webhook notifications when you forget to log

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
- **Database**: Supabase (PostgreSQL)
- **AI**: DeepSeek
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
│   └── api/          # API routes (judge endpoint)
├── components/        # React components
│   ├── DashboardView.tsx
│   ├── OKRStrategyView.tsx
│   └── AnalyticsView.tsx
├── contexts/         # React contexts
│   └── AuthContext.tsx
└── lib/              # Utilities
    ├── supabase.ts   # Supabase client
    └── auth.ts       # Auth utilities
```

---

## Authentication

The app uses Supabase Auth with email/password authentication:

- **Login**: `/login`
- **Register**: `/register`
- **Forgot Password**: `/forgot-password`
- **Reset Password**: `/reset-password` (via email link)
- **Change Password**: Available in the main dashboard (settings icon)

### Database Setup

Run the SQL script in `scripts/database-setup.sql` to configure:
- User ID columns for data isolation
- Row Level Security (RLS) policies

---

## Daily Reminder Setup

The daily reminder feature sends webhook notifications when users forget to log their progress.

### 1. Database Changes

Run `scripts/add-reminder-settings.sql` in Supabase SQL Editor to add reminder-related columns.

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

Run `scripts/setup-pg-cron.sql` in Supabase SQL Editor. Replace `YOUR_CRON_SECRET` with the value from step 4.

### 6. User Configuration

Users can enable reminders in the app:
1. Click the settings icon (⚙️)
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

---

## License

MIT
