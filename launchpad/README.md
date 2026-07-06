# HeyVacay Employee Launchpad 🌴

A premium, travel-tech branded **employee dashboard launchpad** — a unified entry
point to every HeyVacay company tool. Designed to live on employees' Chrome new-tab
page. It authenticates users, keeps sessions alive for a year, enforces role-based
access, and routes each employee to the tools they're allowed to use with one click.

## Quick start

It's a plain static site — no build step.

```bash
# From this folder, serve it locally with anything, e.g.:
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser.

## Deploy to Netlify

1. Point Netlify at this `launchpad/` directory (or drag-and-drop it into the
   Netlify UI).
2. No build command is required — `netlify.toml` sets `publish = "."`.
3. `index.html` is the entry point.

### Use it as your Chrome new-tab page
Install any "custom new tab URL" extension and set it to your deployed Netlify URL.
Because the session is stored in `localStorage` for **1 year**, you sign in once and
land straight on your dashboard every time you open a tab.

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

- 🔐 Client-side auth against a seeded user database, 1-year `localStorage` session,
  auto-redirect for signed-in users, one-click sign out.
- 🧩 Role-filtered app grid — you only ever see the tools you're allowed to open.
- 🔤 **Google Workspace folder** — an expandable tile revealing Gmail, Drive, Docs,
  Sheets, Calendar, Meet (and Google Admin for Super Admins).
- ⚙️ **Admin Console** (Super Admin only): add/edit/delete users, add/edit/delete
  apps with role restrictions, and **broadcast alerts** that appear on everyone's
  launchpad.
- 🔔 Toast notifications for sign in / out and actions.
- 🌓 Light / dark mode toggle.
- 🌊 Signature animated ocean/wave backdrop with the HeyVacay palm watermark.
- 📱 Fully responsive (desktop / tablet / mobile).

## Files

```
launchpad/
├── index.html     # entry point + animated backdrop shell
├── styles.css     # premium beachy-concierge design system
├── app.js         # auth, RBAC, dashboard, admin console, alerts, toasts
├── data.json      # user & app seed data (source of record / backup)
└── netlify.toml   # Netlify static config + SPA fallback
```

The seed data is also embedded in `app.js` so the app works with zero network
requests (important for a new-tab page). On first load it hydrates `localStorage`,
which then becomes the source of truth so admin edits persist.

## Roadmap

- Backend auth (bcrypt) + Google OAuth2 for enterprise SSO
- Google Sheets API (via Netlify Functions) as the shared database so users, apps,
  and alerts sync across devices
- Two-factor auth for Super Admins
- Branded SVG icons in place of emoji
- App-usage analytics
