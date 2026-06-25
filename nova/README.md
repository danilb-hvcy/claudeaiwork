# HeyVacay Nova — Service Command Center

A real-time customer service platform for HeyVacay agents: incoming Zoom Phone
calls and Crisp chats surface live in the portal, calls are transcribed
(AssemblyAI) and summarized (Claude), and everything is stored in Supabase.

```
nova/
├── backend/    Express API + webhooks + WebSocket + integrations
└── frontend/   React (Vite) agent portal
```

## ⚠️ Secrets

No real credentials live in this repo. Every key is read from the environment;
`.env` is gitignored and the committed `.env.example` files contain placeholders
only. **Rotate any key that has been pasted into a chat, prompt, or shared
document** — treat those as compromised and regenerate them in the provider
dashboard. The Anthropic key is **backend-only** and must never reach the
browser bundle.

## Architecture

```
Zoom Phone ─┐                         ┌─ AssemblyAI (transcription)
Crisp Chat ─┤── webhooks ──> Express ─┤─ Claude / claude-opus-4-8 (summary)
            │                  │      └─ Supabase (storage)
            │                  └── WebSocket fan-out ──> React portal (agents)
```

- **Incoming call** → Zoom webhook (HMAC-verified) → customer lookup → broadcast
  `INCOMING_CALL` to all agent browsers.
- **Call ends** → call log saved → if a recording exists, it is transcribed,
  summarized, stored, and a `TRANSCRIPTION_COMPLETE` event is broadcast.
- **Incoming chat** → Crisp webhook → broadcast `INCOMING_CHAT` with an alarm
  flag; accepting a chat assigns it in Crisp and stops the alarm everywhere.

## Setup

### 1. Database (Supabase)
Open the Supabase dashboard → SQL Editor → paste and run
[`backend/database.sql`](backend/database.sql), then
[`backend/auth.sql`](backend/auth.sql) (adds login accounts/roles to `agents`).

### Auth & first-run
- Set a stable **`JWT_SECRET`** env var on the backend (`openssl rand -hex 32`).
- The first time you open the portal it shows a **first-run setup** screen to
  create the initial **admin** account. After that, everyone signs in with a
  username/password.
- Admins get a **Users** tab: create accounts (with a temporary password and a
  "require password change at next login" option), reset passwords, delete users.
- Every `/api/*` route requires a valid login token; webhooks and `/health`
  stay public.

### 2. Backend
```bash
cd backend
cp .env.example .env      # fill in real values locally (never commit .env)
npm install
npm start                 # HTTP API + WebSocket on :3000 (same port)
```
Use the Supabase **service-role** key on the backend so it can write.

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local   # point at your API + WS URLs
npm install
npm run dev                  # http://localhost:5173
```

## Webhook configuration

### Zoom Phone (Server-to-Server OAuth app)
1. marketplace.zoom.us → your app → **Features → Event Subscriptions**.
2. Notification URL: `https://api.nova.heyvacay.co/webhook/zoom-phone`
   (the endpoint answers Zoom's URL-validation challenge automatically).
3. Subscribe to: `phone.caller_incoming`, `phone.callee_incoming`,
   `phone.caller_call_log_completed`, `phone.callee_call_log_completed`,
   `phone.recording_completed_for_access_member`.
4. Copy the **Secret Token** → `ZOOM_WEBHOOK_SECRET` in `.env`.

### Crisp Chat
1. app.crisp.chat → **Workspace Settings → Advanced → Web Hooks**.
2. Add a hook: `https://api.nova.heyvacay.co/webhook/crisp-chat`, event
   `message:received`.

## API reference (selected)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service + connection status |
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent (validates email/phone) |
| PATCH | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete (blocked if on a call) |
| GET | `/api/customer/:phone` | Customer + bookings + calls + prefs |
| GET | `/api/calls/today` | Today's calls (max 100) |
| GET | `/api/call/:callId` | Single call detail |
| POST | `/api/call-notes` | Save agent notes |
| GET | `/api/statistics` | Daily KPIs |
| POST | `/webhook/zoom-phone` | Zoom events (HMAC-verified) |
| POST | `/webhook/crisp-chat` | Crisp events |

## Deployment

- **Frontend** → Vercel. Set `VITE_API_URL=https://api.nova.heyvacay.co` and
  `VITE_WS_URL=wss://api.nova.heyvacay.co`. Add custom domain `nova.heyvacay.co`.
- **Backend** → Railway/Render. Set all `.env` vars as project secrets. Point
  `api.nova.heyvacay.co` at it. The WebSocket shares the HTTP port, so
  `wss://api.nova.heyvacay.co` works with no extra proxy config.
- **Database** → Supabase (already created); run the schema and keep RLS on.

## Notes on the AI summary
Call summaries use the current Claude Opus model (`claude-opus-4-8`) with
adaptive thinking. The model id in any older spec (`claude-opus-4-6`) was
outdated; `claude-opus-4-8` is the current Opus release.
