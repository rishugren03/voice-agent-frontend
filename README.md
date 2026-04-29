# Mykare AI — Frontend

Next.js 16 dashboard for the Mykare voice appointment assistant. Provides a live call console powered by Tavus CVI and a call history view with per-session summaries and cost breakdowns.

---

## Requirements

- Node.js 20+
- The backend API running at a reachable URL (default: `http://localhost:8000`)

---

## Setup

```bash
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL |

---

## File Structure

```
src/
  app/
    page.tsx                 Dashboard overview — live stats and recent sessions
    layout.tsx               Root layout wrapping the shell
    call/
      page.tsx               Live call page — Tavus iframe, tool activity feed, summary
    call-sessions/
      page.tsx               Server component — initial data fetch for call history
      HistoryTable.tsx        Client table with per-session detail slide-over
  components/
    CallDetails.tsx          Renders summary: overview, appointments, cost breakdown
    DashboardLayout.tsx      App shell with sidebar and top header
    Sidebar.tsx              Navigation sidebar
    ToolStatus.tsx           Live feed of tool calls during an active session
    ui/
      sheet.tsx              Radix Dialog-based slide-over panel
  hooks/
    useToolFeed.ts           Reducer that manages tool event state during a call
  lib/
    api.ts                   All fetch calls to the backend API
    utils.ts                 cn() helper for merging Tailwind classes
  types/
    index.ts                 Shared TypeScript interfaces
```

---

## How the Call Page Works

1. Clicking "Open Console" calls `POST /api/tavus/conversation` to create a Tavus CVI session and get an embeddable URL.
2. The Tavus iframe is rendered; Daily.co is used as the underlying WebRTC transport.
3. Tool calls from the Tavus LLM arrive as `conversation.tool_call` postMessage events.
4. Each tool call is forwarded to `POST /api/session/{id}/tool-call` on the backend, which runs the action and returns the result.
5. The result is sent back to Tavus via `conversation.respond` so the agent can continue speaking.
6. When the call ends, `POST /api/session/{id}/finish` triggers summary generation, then the summary is polled and displayed.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
