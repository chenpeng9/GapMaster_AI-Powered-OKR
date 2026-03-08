# GapMaster

AI-Powered OKR (Objectives and Key Results) Management Application. Helps users set goals, track daily progress through logs, and receive AI-generated feedback on their execution.

---

## Features

- **OKR Management** - Create and manage Objectives and Key Results
- **Daily Logging** - Record your daily progress
- **AI Scoring** - Google Gemini AI analyzes your logs and provides scores (0-10)
- **Multi-user Support** - Secure authentication with Supabase
- **Data Analytics** - Visualize your OKR progress with charts

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm / bun
- Supabase account
- Google Gemini API key

### Environment Variables

Create a `.env.local` file with:

```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
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
- **AI**: Google Gemini 2.5 Flash
- **Deployment**: Vercel

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
