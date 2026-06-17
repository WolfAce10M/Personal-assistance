@AGENTS.md

# Personal Operating System (POS)

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL + Auth)
- OpenAI API (gpt-4o)
- Google Calendar API (OAuth2)
- Telegram Bot (grammy)

## Project Structure
```
app/(app)/         → Main app pages (dashboard, tasks, calendar, training, goals, personal-dev, assistant, settings)
app/api/           → API routes
components/ui/     → Reusable UI primitives
components/layout/ → Sidebar, Header
components/*/      → Feature-specific components
lib/               → Supabase, OpenAI, Google Calendar, Telegram clients
hooks/             → React hooks (use-tasks, use-goals, use-chat)
types/             → TypeScript interfaces
supabase/migrations/ → SQL schema
```

## Commands
- `npm run dev` — Start dev server on port 3000
- `npm run build` — Production build
- `npm run lint` — ESLint

## Setup Required
1. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
   - `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`
2. Run Supabase migration: `supabase/migrations/001_initial.sql`
3. Connect Google Calendar via Settings → Google Calendar
4. Set Telegram webhook via Settings → Telegram → "Configurar webhook"

## Key Design Rules
- Dark theme: `bg-zinc-950` base, `bg-zinc-900` cards, `border-zinc-800` borders
- Accent: `indigo-600` primary, `violet-600` gradient
- All text in Spanish
- Protected calendar events (is_protected=true) CANNOT be moved by AI
- Single-user system — no multi-tenancy

## AI Features
- `/api/ai/organize-day` — Generates optimized daily plan
- `/api/ai/chat` — General assistant (context-aware)
- `/api/ai/calendar-command` — Natural language calendar operations
- `/api/ai/training-plan` — AI-generated workout plans
