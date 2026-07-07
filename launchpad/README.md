# HeyVacay Employee Launchpad 🌴

A premium, travel-tech branded **employee dashboard launchpad** — a unified entry
point to every HeyVacay company tool. Designed to live on employees' Chrome new-tab
page. It authenticates users, keeps sessions alive for a year, enforces role-based
access, and routes each employee to the tools they're allowed to use with one click.

## Quick start

`index.html` is **fully self-contained** — all CSS and JS are inlined, no build
step, no sibling files required. You can:

- **Just open it.** Double-click `index.html` (or drag it into a browser). It works
  straight from your Downloads folder over `file://` — sign-in, roles, folders, admin
  panel and all. (When opened this way it uses the seed baked into the file; see
  "Managing users & apps" for how updates work.)
- **Or serve it.** `python3 -m http.server 8000` from this folder, then open
  `http://localhost:8000`.

> ⚠️ If you download this to use it, download **`index.html`** — that one file is
> everything. Earlier versions split styling/logic into `styles.css` and `app.js`;
> those are now inlined, so a lone `index.html` no longer renders blank.

## Deploy to Netlify

1. Point Netlify at this `launchpad/` directory (or drag-and-drop it into the
   Netlify UI).
2. No build command is required — `netlify.toml` sets `publish = "."`.
3. `index.html` is the entry point.

### Use it as your Chrome new-tab page
Install any "custom new tab URL" extension and set it to your deployed Netlify URL.
Because the session is stored in `localStorage` for **1 year**, you sign in once and
land straight on your dashboard every time you open a tab.

## Managing users & apps (the "code + redeploy" database)

There's no backend server. The seed data lives in **two places, kept in sync:**

- **Embedded in `index.html`** — used when the file is opened directly (`file://`) or
  served without `data.json`. This is what a downloaded single file uses.
- **`data.json`** — when the launchpad is served over HTTP (e.g. Netlify), it fetches
  this file and, if its `version` is newer, refreshes every employee's user/app lists.
  This is the "database" for the hosted deployment.

To change who can log in or which tools appear (hosted / Netlify):

1. Open the launchpad as a Super Admin → **⚙️ Admin Console**.
2. Add / edit / delete users and apps in the **👥 Users** and **🧩 Apps** tabs.
   These changes are a **draft on your device** (a banner reminds you).
3. Go to the **📦 Publish** tab → **Download data.json** (it already has your changes
   and an incremented `version`).
4. Replace `launchpad/data.json` in the repo with that file, `git commit` and
   `git push`. Netlify redeploys automatically.
5. Every launchpad refreshes to the new version on the next new tab — no action
   needed by staff.

> The `version` field is what makes a redeploy propagate. When a browser sees a
> `data.json` whose `version` is newer than what it last applied, it refreshes its
> local user/app lists. Always bump it when you publish (the Publish tab does this
> for you).

**Even simpler:** anyone with repo access can add a user by editing `data.json`
directly in GitHub — add the entry and bump `version` — no admin panel needed.

## Sign-in accounts (seed data)

| Name | Username | Password | Role |
|------|----------|----------|------|
| Danil Babadjanov | `danilb` | `Danilka2010!` | Super Admin |
| Aleksey Babadzhanov | `alekseyb` | `Aleksey2131!` | Super Admin |
| Leonid Babadjanov | `leonidb` | `Danil2010!` | Admin Plus |
| Estefania Babadzhanov | `stefb` | `Estefmac2131!` | Standard User |

> ⚠️ Passwords are stored in plain text client-side for this MVP. Before production,
> move auth to a backend with hashed passwords (bcrypt) and/or Google OAuth.

## Roles & access

- **Super Admin** — every app, including Google Admin, Stripe, ReceptionHQ, RateHawk,
  plus the ⚙️ Admin Console.
- **Admin Plus** — everything except Stripe, Google Admin, and ReceptionHQ (includes
  RateHawk).
- **Standard User** — core HeyVacay tools (Google Suite, Zendesk, HCED, Gusto,
  HeyVacay, Zoom).

## Features

- 🌴 **HeyVacay branded** — the palm-tree logo/wordmark in the header and on the
  sign-in screen (adapts to light/dark).
- 👋 **Personalized greeting** — "Welcome, [Name]" plus a time-of-day line
  ("It's a great morning/afternoon/evening to …") with a rotating, catchy tagline.
- 🔐 Client-side auth against a seeded user database, 1-year `localStorage` session,
  auto-redirect for signed-in users, one-click sign out.
- 🧩 Role-filtered app grid — you only ever see the tools you're allowed to open.
- 🔤 **Google Workspace folder** — an expandable tile revealing Gmail, Drive, Docs,
  Sheets, Calendar, Meet (and Google Admin for Super Admins).
- 📣 **Announcements** — a section above the apps where **Super Admins post
  announcements inline** (a "＋ New announcement" composer); everyone else sees and
  can dismiss them. (Also postable from the Admin Console → Broadcast tab.)
- ⚙️ **Admin Console** (Super Admin only): add/edit/delete users, add/edit/delete
  apps with role restrictions, and manage announcements.
- 🔔 Toast notifications for sign in / out and actions.
- 🖥️ **Idle screensaver** — after 60s of inactivity a full-screen branded banner
  (Ken Burns tropical backdrop, floating glowing logo, animated "Smarter, Cheaper,
  Faster" motto) fades in; any mouse / key / scroll / touch dismisses it and resets
  the timer.
- 🌓 Light / dark mode toggle.
- 🌊 Signature animated ocean/wave backdrop with the HeyVacay palm watermark.
- 📱 Fully responsive (desktop / tablet / mobile).

## Files

```
launchpad/
├── index.html     # THE app — self-contained (inlined CSS + JS + embedded seed)
├── data.json      # user & app seed for hosted deploys (version-synced override)
├── netlify.toml   # Netlify static config + SPA fallback
└── README.md
```

`index.html` is everything — CSS, JS, and a copy of the seed are all inlined, so it
works with zero network requests (ideal for a downloaded file or new-tab page). When
served over HTTP it additionally fetches `data.json` and adopts it if the `version`
is newer, which is how hosted updates reach everyone. On first load it hydrates
`localStorage`, which then holds any local admin-panel edits until you publish.

## Roadmap

- Backend auth (bcrypt) + Google OAuth2 for enterprise SSO
- Google Sheets API (via Netlify Functions) as the shared database so users, apps,
  and alerts sync across devices
- Two-factor auth for Super Admins
- Branded SVG icons in place of emoji
- App-usage analytics
