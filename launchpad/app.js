/* ═══════════════════════════════════════════════════════════════════
   HeyVacay Employee Launchpad — Application Logic (vanilla JS)
   - Client-side auth against seeded user DB
   - 1-year localStorage session
   - Role-based app rendering
   - Super Admin panel (users / apps / broadcast alerts)
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ─── Storage keys ───────────────────────────────────────────────── */
const KEY = {
  users:   'hv_launchpad_users',
  apps:    'hv_launchpad_apps',
  session: 'hv_launchpad_session',
  alerts:  'hv_launchpad_alerts',
  dismissed: 'hv_launchpad_alerts_dismissed',
  theme:   'hv_launchpad_theme',
  seedVersion: 'hv_launchpad_seed_version',
};

const SESSION_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin_plus:  'Admin Plus',
  standard:    'Standard User',
};
const ROLE_ORDER = ['standard', 'admin_plus', 'super_admin'];

/* ─── Seed data ───────────────────────────────────────────────────
   data.json (fetched at runtime) is the published source of truth — the
   "database" in the code + redeploy model. Bump its "version" whenever you
   change users/apps and every launchpad will refresh on the next load.
   This embedded copy is only a fallback for offline / file:// use.
   ────────────────────────────────────────────────────────────────── */
const SEED = {
  version: 2,
  users: [
    { name: 'DANIL BABADJANOV',     username: 'danilb',   password: 'Danilka2010!', role: 'super_admin' },
    { name: 'ALEKSEY BABADZHANOV',  username: 'alekseyb', password: 'Aleksey2131!', role: 'super_admin' },
    { name: 'LEONID BABADJANOV',    username: 'leonidb',  password: 'Danil2010!',   role: 'admin_plus'  },
    { name: 'Estefania Babadzhanov',username: 'stefb',    password: 'Estefmac2131!',role: 'standard'    },
  ],
  apps: [
    {
      id: 'google-workspace', name: 'Google Workspace', icon: '🔤',
      description: 'Email, Drive, Docs, Sheets, Calendar, Meet',
      roles: ['standard', 'admin_plus', 'super_admin'],
      subApps: [
        { name: 'Gmail',            icon: '📬', url: 'https://mail.google.com',     roles: ['standard', 'admin_plus', 'super_admin'] },
        { name: 'Google Drive',     icon: '📁', url: 'https://drive.google.com',    roles: ['standard', 'admin_plus', 'super_admin'] },
        { name: 'Google Docs',      icon: '📄', url: 'https://docs.google.com',     roles: ['standard', 'admin_plus', 'super_admin'] },
        { name: 'Google Sheets',    icon: '📊', url: 'https://sheets.google.com',   roles: ['standard', 'admin_plus', 'super_admin'] },
        { name: 'Google Calendar',  icon: '📅', url: 'https://calendar.google.com', roles: ['standard', 'admin_plus', 'super_admin'] },
        { name: 'Google Meet',      icon: '🎥', url: 'https://meet.google.com',     roles: ['standard', 'admin_plus', 'super_admin'] },
        { name: 'Google Admin',     icon: '🛡️', url: 'https://admin.google.com',    roles: ['super_admin'] },
      ],
    },
    {
      id: 'support-tools', name: 'Support Tools', icon: '🎧',
      description: 'Zendesk, Zoom & HeyVacay NOVA',
      roles: ['standard', 'admin_plus', 'super_admin'],
      subApps: [
        { name: 'Zendesk',       icon: '📞', url: 'https://zendesk.com',       roles: ['standard', 'admin_plus', 'super_admin'] },
        { name: 'Zoom',          icon: '📱', url: 'https://zoom.us',           roles: ['standard', 'admin_plus', 'super_admin'] },
        { name: 'HeyVacay NOVA', icon: '🚀', url: 'https://admin.heyvacay.co', roles: ['standard', 'admin_plus', 'super_admin'] },
      ],
    },
    { id: 'hced',        name: 'HCED System', icon: '🏨', description: 'Hotel Complaint & Escalation', url: 'https://hced.heyvacay.co',         roles: ['standard', 'admin_plus', 'super_admin'] },
    { id: 'gusto',       name: 'Gusto',       icon: '💰', description: 'Contractor Payroll',          url: 'https://gusto.com',                roles: ['standard', 'admin_plus', 'super_admin'] },
    { id: 'heyvacay',    name: 'HeyVacay',    icon: '✈️', description: 'Main Booking Platform',        url: 'https://heyvacay.co',              roles: ['standard', 'admin_plus', 'super_admin'] },
    { id: 'ratehawk',    name: 'RateHawk',    icon: '🔑', description: 'Hotel Inventory Admin',        url: 'https://dashboard.ratehawk.com',   roles: ['admin_plus', 'super_admin'] },
    { id: 'stripe',      name: 'Stripe',      icon: '💳', description: 'Payment Processing',           url: 'https://dashboard.stripe.com',     roles: ['super_admin'] },
    { id: 'receptionhq', name: 'ReceptionHQ', icon: '📧', description: 'Email Forwarding & Management',url: 'https://receptionhq.com',          roles: ['super_admin'] },
  ],
};

/* ─── Storage helpers ────────────────────────────────────────────── */
const store = {
  get(k, fallback) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

/* ─── Data accessors (localStorage is the source of truth after seed) */
function getUsers() {
  let u = store.get(KEY.users, null);
  if (!u) { u = structuredCloneSafe(SEED.users); store.set(KEY.users, u); }
  return u;
}
function saveUsers(u) { store.set(KEY.users, u); }

function getApps() {
  let a = store.get(KEY.apps, null);
  if (!a) { a = structuredCloneSafe(SEED.apps); store.set(KEY.apps, a); }
  return a;
}
function saveApps(a) { store.set(KEY.apps, a); }

function getAlerts() { return store.get(KEY.alerts, []); }
function saveAlerts(a) { store.set(KEY.alerts, a); }

function structuredCloneSafe(obj) { return JSON.parse(JSON.stringify(obj)); }

/* ─── Published seed sync (the "code + redeploy" database) ──────────
   Fetch data.json (the committed source of truth). If its version differs
   from what this browser last applied, overwrite the local user/app lists —
   so pushing a new data.json propagates to every employee on their next tab.
   Falls back to the embedded SEED if the fetch fails (offline / file://).
   ────────────────────────────────────────────────────────────────── */
let PUBLISHED_VERSION = SEED.version;

async function loadPublishedSeed() {
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      if (j && Array.isArray(j.users) && Array.isArray(j.apps)) {
        return { version: Number(j.version) || 1, users: j.users, apps: j.apps };
      }
    }
  } catch { /* offline / file:// — fall through to embedded seed */ }
  return { version: SEED.version, users: SEED.users, apps: SEED.apps };
}

function applyPublishedSeed(seed) {
  PUBLISHED_VERSION = seed.version;
  const appliedVersion = store.get(KEY.seedVersion, null);
  const firstRun = store.get(KEY.users, null) === null;
  // Published version wins: (re)hydrate local lists when the deploy is newer
  // than what this browser last saw, or on the very first visit.
  if (appliedVersion !== seed.version || firstRun) {
    store.set(KEY.users, structuredCloneSafe(seed.users));
    store.set(KEY.apps, structuredCloneSafe(seed.apps));
    store.set(KEY.seedVersion, seed.version);
  }
}

/* ─── Session ────────────────────────────────────────────────────── */
function getSession() {
  const s = store.get(KEY.session, null);
  if (!s) return null;
  if (!s.expiresAt || Date.now() > s.expiresAt) { store.del(KEY.session); return null; }
  return s;
}
function currentUser() {
  const s = getSession();
  if (!s) return null;
  return getUsers().find(u => u.username === s.username) || null;
}
function startSession(user) {
  store.set(KEY.session, { username: user.username, expiresAt: Date.now() + SESSION_MS });
}
function endSession() { store.del(KEY.session); }

/* ─── Utilities ──────────────────────────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const app = () => document.getElementById('app');

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function initials(name) {
  return String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}
function firstName(name) {
  const n = String(name || '').trim().split(/\s+/)[0] || '';
  return n ? n[0].toUpperCase() + n.slice(1).toLowerCase() : 'there';
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}
function canAccess(item, role) { return Array.isArray(item.roles) && item.roles.includes(role); }

/* ─── Theme ──────────────────────────────────────────────────────── */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  store.set(KEY.theme, t);
}
function initTheme() {
  const saved = store.get(KEY.theme, null);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  toast(next === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on', 'info');
}

/* ─── Toast notifications ────────────────────────────────────────── */
function toast(message, type = 'info', title = '') {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const icons = { success: '✅', error: '⚠️', info: '💡' };
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `
    <span class="toast__icon">${icons[type] || '💡'}</span>
    <div class="toast__msg">${title ? `<strong class="toast__title">${esc(title)}</strong>` : ''}${esc(message)}</div>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 3600);
}

/* ═══════════════════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════════════════ */
function render() {
  const user = currentUser();
  if (user) renderDashboard(user);
  else renderLogin();
}

/* ─── LOGIN ──────────────────────────────────────────────────────── */
function renderLogin() {
  app().innerHTML = `
    <div class="login view-enter">
      <form class="login__card" id="login-form" autocomplete="on" novalidate>
        <div class="login__brand">
          <span class="brand__mark">🌴</span>
        </div>
        <h1 class="login__title">Welcome to HeyVacay Operations</h1>
        <p class="login__subtitle">Sign in to launch your workspace.</p>

        <div class="login__error" id="login-error">
          <span>⚠️</span><span id="login-error-msg">Invalid credentials.</span>
        </div>

        <div class="field">
          <label class="field__label" for="username">Username or Email</label>
          <input class="field__input" id="username" name="username" type="text"
                 placeholder="e.g. danilb" autocomplete="username" autofocus required />
        </div>

        <div class="field field--pw">
          <label class="field__label" for="password">Password</label>
          <input class="field__input" id="password" name="password" type="password"
                 placeholder="••••••••" autocomplete="current-password" required />
          <button type="button" class="field__toggle" id="pw-toggle" aria-label="Show password">Show</button>
        </div>

        <button type="submit" class="btn btn--primary" id="login-btn">Sign In</button>

        <div class="login__foot">Sessions stay active for 1 year on this device.</div>
      </form>
    </div>`;

  const form = $('#login-form');
  const errBox = $('#login-error');
  const pwInput = $('#password');

  $('#pw-toggle').addEventListener('click', () => {
    const showing = pwInput.type === 'text';
    pwInput.type = showing ? 'password' : 'text';
    $('#pw-toggle').textContent = showing ? 'Show' : 'Hide';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errBox.classList.remove('show');
    const username = $('#username').value.trim();
    const password = pwInput.value;
    if (!username || !password) return;

    const btn = $('#login-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Signing in…`;

    // Simulate a brief auth round-trip for polish
    setTimeout(() => {
      const uname = username.toLowerCase();
      const user = getUsers().find(u =>
        u.username.toLowerCase() === uname ||
        (u.email && u.email.toLowerCase() === uname)
      );
      if (!user || user.password !== password) {
        btn.disabled = false;
        btn.textContent = 'Sign In';
        $('#login-error-msg').textContent = 'Invalid username or password. Please try again.';
        errBox.classList.add('show');
        pwInput.select();
        return;
      }
      startSession(user);
      toast(`Signed in as ${firstName(user.name)}`, 'success', 'Welcome back');
      render();
    }, 620);
  });
}

/* ─── DASHBOARD ──────────────────────────────────────────────────── */
function renderDashboard(user) {
  const isSuper = user.role === 'super_admin';
  const apps = getApps().filter(a => canAccess(a, user.role));

  app().innerHTML = `
    <div class="shell view-enter">
      <header class="topbar">
        <span class="brand">
          <span class="brand__mark">🌴</span>
          <span class="brand__word">hey<strong>vacay</strong></span>
        </span>
        <div class="topbar__spacer"></div>
        <button class="iconbtn" id="theme-btn" title="Toggle theme" aria-label="Toggle theme">🌓</button>
        ${isSuper ? `<button class="iconbtn" id="admin-btn" title="Admin panel" aria-label="Admin panel">⚙️</button>` : ''}
        <div class="userchip">
          <span class="userchip__avatar">${esc(initials(user.name))}</span>
          <span class="userchip__meta">
            <span class="userchip__name">${esc(user.name)}</span>
            <span class="userchip__role">${esc(ROLE_LABELS[user.role] || user.role)}</span>
          </span>
        </div>
        <button class="btn btn--ghost btn--sm" id="signout-btn">Sign Out</button>
      </header>

      <section class="hero">
        <span class="hero__eyebrow">Employee Launchpad</span>
        <h1 class="hero__title">Welcome, <span>${esc(firstName(user.name))}</span> 👋</h1>
        <p class="hero__sub">You have access to ${apps.length} tool${apps.length === 1 ? '' : 's'}. Click any card to launch.</p>
      </section>

      <div class="alerts" id="alerts"></div>

      <main class="grid" id="grid"></main>
    </div>`;

  $('#theme-btn').addEventListener('click', toggleTheme);
  $('#signout-btn').addEventListener('click', () => {
    endSession();
    toast('You have been signed out.', 'info');
    render();
  });
  if (isSuper) $('#admin-btn').addEventListener('click', openAdmin);

  renderAlerts();
  renderGrid(user, apps);
}

function renderAlerts() {
  const box = $('#alerts');
  if (!box) return;
  const dismissed = store.get(KEY.dismissed, []);
  const alerts = getAlerts().filter(a => !dismissed.includes(a.id));
  box.innerHTML = alerts.map(a => `
    <div class="alert" data-id="${esc(a.id)}">
      <span class="alert__icon">📣</span>
      <div class="alert__body">
        <div class="alert__title">${esc(a.title || 'Announcement')}</div>
        <div class="alert__text">${esc(a.text)}</div>
        <div class="alert__time">${esc(a.from || 'Admin')} · ${esc(timeAgo(a.ts))}</div>
      </div>
      <button class="alert__dismiss" data-dismiss="${esc(a.id)}" aria-label="Dismiss">×</button>
    </div>`).join('');

  box.querySelectorAll('[data-dismiss]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-dismiss');
      const d = store.get(KEY.dismissed, []);
      d.push(id); store.set(KEY.dismissed, d);
      renderAlerts();
    });
  });
}

function renderGrid(user, apps) {
  const grid = $('#grid');
  if (!apps.length) {
    grid.innerHTML = `<div class="empty">No tools are assigned to your account yet. Contact an administrator.</div>`;
    return;
  }

  grid.innerHTML = apps.map(a => {
    const isFolder = Array.isArray(a.subApps) && a.subApps.length;
    const restricted = a.roles.length === 1 && a.roles[0] === 'super_admin';
    return `
      <button class="tile ${isFolder ? 'tile--folder' : ''}" data-app="${esc(a.id)}">
        ${isFolder ? `<span class="tile__badge tile__badge--folder">Folder</span>`
          : restricted ? `<span class="tile__badge tile__badge--restricted">Admin</span>` : ''}
        <span class="tile__icon">${esc(a.icon || '🔗')}</span>
        <span class="tile__name">${esc(a.name)}</span>
        <span class="tile__desc">${esc(a.description || '')}</span>
        <span class="tile__go">${isFolder ? '<span class="tile__chev">▼ Expand</span>' : 'Open ↗'}</span>
      </button>`;
  }).join('');

  grid.querySelectorAll('.tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const id = tile.getAttribute('data-app');
      const a = apps.find(x => x.id === id);
      if (!a) return;
      if (Array.isArray(a.subApps) && a.subApps.length) toggleFolder(tile, a, user);
      else launch(a.url, a.name);
    });
  });
}

function toggleFolder(tile, appData, user) {
  // Close if already open
  const existing = tile.nextElementSibling;
  if (existing && existing.classList.contains('folder-panel')) {
    existing.remove();
    tile.classList.remove('open');
    return;
  }
  // Close other open folders
  document.querySelectorAll('.folder-panel').forEach(p => p.remove());
  document.querySelectorAll('.tile--folder.open').forEach(t => t.classList.remove('open'));

  tile.classList.add('open');
  const subs = appData.subApps.filter(s => canAccess(s, user.role));
  const panel = document.createElement('div');
  panel.className = 'folder-panel';
  panel.innerHTML = subs.map(s => `
    <div class="subtile" data-url="${esc(s.url)}" data-name="${esc(s.name)}" role="button" tabindex="0">
      <span class="subtile__icon">${esc(s.icon || '🔗')}</span>
      <span class="subtile__name">${esc(s.name)}</span>
    </div>`).join('');
  tile.after(panel);

  panel.querySelectorAll('.subtile').forEach(st => {
    const go = () => launch(st.getAttribute('data-url'), st.getAttribute('data-name'));
    st.addEventListener('click', go);
    st.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
}

function launch(url, name) {
  if (!url) return;
  toast(`Opening ${name}…`, 'info');
  window.open(url, '_blank', 'noopener,noreferrer');
}

/* ═══════════════════════════════════════════════════════════════════
   ADMIN PANEL (Super Admin only)
   ═══════════════════════════════════════════════════════════════════ */
let adminTab = 'users';

function openAdmin() {
  const user = currentUser();
  if (!user || user.role !== 'super_admin') { toast('Access denied.', 'error'); return; }

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'admin-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Admin panel">
      <div class="modal__head">
        <span class="brand__mark" style="width:34px;height:34px;font-size:18px;border-radius:10px;">⚙️</span>
        <span class="modal__title">Admin Console</span>
        <button class="modal__close" id="admin-close" aria-label="Close">×</button>
      </div>
      <div class="modal__body">
        <div class="tabs">
          <button class="tab" data-tab="users">👥 Users</button>
          <button class="tab" data-tab="apps">🧩 Apps</button>
          <button class="tab" data-tab="broadcast">📣 Broadcast</button>
          <button class="tab" data-tab="publish">📦 Publish</button>
        </div>
        <div id="admin-content"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('mousedown', e => { if (e.target === overlay) closeAdmin(); });
  $('#admin-close').addEventListener('click', closeAdmin);
  document.addEventListener('keydown', escClose);

  overlay.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => { adminTab = t.getAttribute('data-tab'); paintAdmin(); });
  });

  paintAdmin();
}
function escClose(e) { if (e.key === 'Escape') closeAdmin(); }
function closeAdmin() {
  const o = $('#admin-overlay');
  if (o) o.remove();
  document.removeEventListener('keydown', escClose);
  // Reflect any changes made in the console (broadcasts, etc.) on the dashboard.
  if ($('#alerts')) renderAlerts();
}

function paintAdmin() {
  document.querySelectorAll('#admin-overlay .tab').forEach(t =>
    t.classList.toggle('active', t.getAttribute('data-tab') === adminTab));
  const c = $('#admin-content');
  if (adminTab === 'users') renderAdminUsers(c);
  else if (adminTab === 'apps') renderAdminApps(c);
  else if (adminTab === 'broadcast') renderAdminBroadcast(c);
  else renderAdminPublish(c);
}

/* Honest banner: in-panel edits are a browser-local draft until published. */
function draftBanner() {
  return `<div class="draft-note">
    ✏️ <span>Edits here are a <strong>draft on this device</strong>. To make them live for all staff, open the <strong>📦 Publish</strong> tab and commit the exported <code>data.json</code>.</span>
  </div>`;
}

/* ── Users tab ── */
function renderAdminUsers(c) {
  const users = getUsers();
  const me = currentUser();
  c.innerHTML = `
    ${draftBanner()}
    <div class="panel-section">
      <div class="panel-section__title">Add New User</div>
      <form id="add-user-form" class="form-grid">
        <div class="field"><label class="field__label">Full Name</label><input class="field__input field__input--sm" name="name" required placeholder="Jane Traveler" /></div>
        <div class="field"><label class="field__label">Username</label><input class="field__input field__input--sm" name="username" required placeholder="janet" /></div>
        <div class="field"><label class="field__label">Password</label><input class="field__input field__input--sm" name="password" required placeholder="••••••" /></div>
        <div class="field"><label class="field__label">Role</label>
          <select class="field__input field__input--sm" name="role">
            <option value="standard">Standard User</option>
            <option value="admin_plus">Admin Plus</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <button type="submit" class="btn btn--primary btn--sm">Add User</button>
      </form>
    </div>
    <div class="panel-section">
      <div class="panel-section__title">All Users (${users.length})</div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Username</th><th>Role</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>
          ${users.map((u, i) => `
            <tr>
              <td>${esc(u.name)}</td>
              <td>${esc(u.username)}</td>
              <td><span class="pill pill--${u.role}">${esc(ROLE_LABELS[u.role] || u.role)}</span></td>
              <td><div class="row-actions">
                <button class="miniact" data-edit-user="${i}">Edit role</button>
                <button class="miniact miniact--del" data-del-user="${i}" ${u.username === me.username ? 'disabled title="You cannot delete yourself"' : ''}>Delete</button>
              </div></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  $('#add-user-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim(), username = f.username.value.trim().toLowerCase(), password = f.password.value, role = f.role.value;
    if (!name || !username || !password) return;
    const users = getUsers();
    if (users.some(u => u.username.toLowerCase() === username)) { toast('That username already exists.', 'error'); return; }
    users.push({ name, username, password, role });
    saveUsers(users);
    toast(`User "${username}" added.`, 'success');
    renderAdminUsers(c);
  });

  c.querySelectorAll('[data-del-user]').forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    const i = +b.getAttribute('data-del-user');
    const users = getUsers();
    const u = users[i];
    if (!confirm(`Delete user "${u.name}" (${u.username})?`)) return;
    users.splice(i, 1);
    saveUsers(users);
    toast('User deleted.', 'success');
    renderAdminUsers(c);
  }));

  c.querySelectorAll('[data-edit-user]').forEach(b => b.addEventListener('click', () => {
    const i = +b.getAttribute('data-edit-user');
    const users = getUsers();
    const u = users[i];
    const next = prompt(`Set role for ${u.name}.\nType one of: standard, admin_plus, super_admin`, u.role);
    if (!next) return;
    if (!ROLE_ORDER.includes(next.trim())) { toast('Invalid role.', 'error'); return; }
    users[i].role = next.trim();
    saveUsers(users);
    toast('Role updated.', 'success');
    renderAdminUsers(c);
  }));
}

/* ── Apps tab ── */
function renderAdminApps(c) {
  const apps = getApps();
  c.innerHTML = `
    ${draftBanner()}
    <div class="panel-section">
      <div class="panel-section__title">Add New App</div>
      <form id="add-app-form" class="form-grid">
        <div class="field"><label class="field__label">App Name</label><input class="field__input field__input--sm" name="name" required placeholder="Notion" /></div>
        <div class="field"><label class="field__label">Icon (emoji)</label><input class="field__input field__input--sm" name="icon" placeholder="📝" maxlength="4" /></div>
        <div class="field"><label class="field__label">URL</label><input class="field__input field__input--sm" name="url" type="url" required placeholder="https://…" /></div>
        <div class="field"><label class="field__label">Description</label><input class="field__input field__input--sm" name="description" placeholder="Docs & wiki" /></div>
        <div class="field"><label class="field__label">Min. Role</label>
          <select class="field__input field__input--sm" name="minrole">
            <option value="standard">Standard &amp; up</option>
            <option value="admin_plus">Admin Plus &amp; up</option>
            <option value="super_admin">Super Admin only</option>
          </select>
        </div>
        <button type="submit" class="btn btn--primary btn--sm">Add App</button>
      </form>
    </div>
    <div class="panel-section">
      <div class="panel-section__title">All Apps (${apps.length})</div>
      <table class="data-table">
        <thead><tr><th>App</th><th>Access</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>
          ${apps.map((a, i) => `
            <tr>
              <td>${esc(a.icon || '🔗')} <strong>${esc(a.name)}</strong>${a.subApps ? ` <span class="pill pill--admin_plus">folder</span>` : ''}<br><span style="color:var(--text-faint);font-size:12px">${esc(a.url || a.description || '')}</span></td>
              <td>${a.roles.map(r => `<span class="pill pill--${r}">${esc(ROLE_LABELS[r] || r)}</span>`).join(' ')}</td>
              <td><div class="row-actions">
                <button class="miniact" data-edit-app="${i}">Access</button>
                <button class="miniact miniact--del" data-del-app="${i}">Delete</button>
              </div></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  $('#add-app-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim();
    const url = f.url.value.trim();
    if (!name || !url) return;
    const minrole = f.minrole.value;
    const roles = ROLE_ORDER.slice(ROLE_ORDER.indexOf(minrole)); // this role & higher
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.floor(performance.now());
    const apps = getApps();
    apps.push({ id, name, icon: f.icon.value.trim() || '🔗', description: f.description.value.trim(), url, roles });
    saveApps(apps);
    toast(`App "${name}" added.`, 'success');
    renderAdminApps(c);
  });

  c.querySelectorAll('[data-del-app]').forEach(b => b.addEventListener('click', () => {
    const i = +b.getAttribute('data-del-app');
    const apps = getApps();
    if (!confirm(`Delete app "${apps[i].name}"?`)) return;
    apps.splice(i, 1);
    saveApps(apps);
    toast('App deleted.', 'success');
    renderAdminApps(c);
  }));

  c.querySelectorAll('[data-edit-app]').forEach(b => b.addEventListener('click', () => {
    const i = +b.getAttribute('data-edit-app');
    const apps = getApps();
    const a = apps[i];
    const next = prompt(`Minimum role for "${a.name}".\nType one of: standard, admin_plus, super_admin`, a.roles[0]);
    if (!next) return;
    const min = next.trim();
    if (!ROLE_ORDER.includes(min)) { toast('Invalid role.', 'error'); return; }
    a.roles = ROLE_ORDER.slice(ROLE_ORDER.indexOf(min));
    saveApps(apps);
    toast('Access updated.', 'success');
    renderAdminApps(c);
  }));
}

/* ── Broadcast tab ── */
function renderAdminBroadcast(c) {
  const me = currentUser();
  const alerts = getAlerts();
  c.innerHTML = `
    <div class="panel-section">
      <div class="panel-section__title">Send an Alert to Everyone</div>
      <form id="broadcast-form">
        <div class="field"><label class="field__label">Title</label><input class="field__input field__input--sm" name="title" placeholder="System maintenance" required /></div>
        <div class="field" style="margin-top:12px"><label class="field__label">Message</label><input class="field__input field__input--sm" name="text" placeholder="Zendesk will be down 9–10pm ET tonight." required /></div>
        <button type="submit" class="btn btn--primary btn--sm" style="margin-top:14px">📣 Broadcast Alert</button>
      </form>
      <p style="font-size:12px;color:var(--text-faint);margin-top:10px">Alerts appear on every employee's launchpad on this device until dismissed.</p>
    </div>
    <div class="panel-section">
      <div class="panel-section__title">Active Alerts (${alerts.length})</div>
      ${alerts.length ? `<table class="data-table"><tbody>
        ${alerts.slice().reverse().map(a => `
          <tr>
            <td><strong>${esc(a.title)}</strong><br><span style="color:var(--text-soft);font-size:12.5px">${esc(a.text)}</span><br><span style="color:var(--text-faint);font-size:11px">${esc(a.from)} · ${esc(timeAgo(a.ts))}</span></td>
            <td style="text-align:right"><button class="miniact miniact--del" data-del-alert="${esc(a.id)}">Remove</button></td>
          </tr>`).join('')}
      </tbody></table>` : `<p style="color:var(--text-faint);font-size:13px">No active alerts.</p>`}
    </div>`;

  $('#broadcast-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const title = f.title.value.trim(), text = f.text.value.trim();
    if (!title || !text) return;
    const alerts = getAlerts();
    alerts.push({ id: 'al_' + Math.floor(performance.now()) + '_' + alerts.length, title, text, from: firstName(me.name), ts: Date.now() });
    saveAlerts(alerts);
    // Clear dismissals so the new alert shows for everyone
    store.del(KEY.dismissed);
    toast('Alert broadcast to all employees.', 'success');
    renderAdminBroadcast(c);
  });

  c.querySelectorAll('[data-del-alert]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-del-alert');
    saveAlerts(getAlerts().filter(a => a.id !== id));
    toast('Alert removed.', 'success');
    renderAdminBroadcast(c);
  }));
}

/* ── Publish tab (export the committed data.json) ── */
function buildPublishJson() {
  // Preserve the role labels for readability; bump the version so deployed
  // launchpads know to refresh.
  const payload = {
    version: (Number(PUBLISHED_VERSION) || 1) + 1,
    roles: ROLE_LABELS,
    users: getUsers(),
    apps: getApps(),
  };
  return JSON.stringify(payload, null, 2);
}

function renderAdminPublish(c) {
  const nextVersion = (Number(PUBLISHED_VERSION) || 1) + 1;
  const json = buildPublishJson();
  c.innerHTML = `
    <div class="panel-section">
      <div class="panel-section__title">Publish to all staff</div>
      <p class="publish-lead">
        This launchpad uses a <strong>code + redeploy</strong> database: the file
        <code>launchpad/data.json</code> in your repo is the source of truth. Your
        in-panel edits are saved on this device only until you publish them.
      </p>
      <ol class="publish-steps">
        <li><strong>Download</strong> (or copy) the updated <code>data.json</code> below — it already includes every user &amp; app change you made, with the version bumped to <strong>v${nextVersion}</strong>.</li>
        <li>Replace <code>launchpad/data.json</code> in the repo with it and <code>git commit</code> + <code>git push</code>.</li>
        <li>Netlify redeploys automatically. Every employee's launchpad refreshes to v${nextVersion} on their next tab.</li>
      </ol>
      <div class="publish-actions">
        <button class="btn btn--primary btn--sm" id="pub-download">⬇ Download data.json</button>
        <button class="btn btn--ghost btn--sm" id="pub-copy">📋 Copy JSON</button>
      </div>
      <textarea class="publish-code" id="pub-json" spellcheck="false" readonly>${esc(json)}</textarea>
      <p class="publish-tip">💡 No coding needed to add someone in a pinch — you (or anyone) can also just edit this <code>data.json</code> in GitHub directly and bump the <code>version</code> number.</p>
    </div>`;

  $('#pub-copy').addEventListener('click', async () => {
    const text = buildPublishJson();
    try {
      await navigator.clipboard.writeText(text);
      toast('data.json copied to clipboard.', 'success');
    } catch {
      const ta = $('#pub-json'); ta.focus(); ta.select();
      toast('Press ⌘/Ctrl+C to copy the selected JSON.', 'info');
    }
  });

  $('#pub-download').addEventListener('click', () => {
    const blob = new Blob([buildPublishJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'data.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('data.json downloaded — commit it to publish.', 'success');
  });
}

/* ═══════════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════════ */
initTheme();
(async () => {
  const seed = await loadPublishedSeed(); // published data.json (or embedded fallback)
  applyPublishedSeed(seed);               // published version wins over local drafts
  render();
})();
