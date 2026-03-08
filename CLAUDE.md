# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GapMaster is an AI-powered OKR (Objectives and Key Results) management application. It helps users set goals, track daily progress through logs, and receive AI-generated feedback on their execution.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Tech Stack
- **Next.js 16** with App Router
- **React 19** for UI
- **Supabase** for database (PostgreSQL)
- **DeepSeek** (deepseek-chat) for AI scoring
- **Tailwind CSS 4** + **shadcn/ui** for styling
- **Recharts** for data visualization

### Project Structure
- `src/app/` - Next.js pages and API routes
- `src/components/` - React components (DashboardView, OKRStrategyView, AnalyticsView)
- `src/lib/` - Utilities (Supabase client, OKR helpers, utils)

### Key API
- `POST /api/judge` - AI scoring endpoint that analyzes daily logs against OKRs and returns score (0-10), category, analysis, and KR associations

### Database
Uses Supabase with tables for objectives, key_results, and daily_logs. Client is configured in `src/lib/supabase.ts`.

### Environment Variables
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
