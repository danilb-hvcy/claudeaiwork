// Thin REST + SSE client for the Nova backend.
// All endpoints/secrets stay server-side; the browser only knows public URLs.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// --- Auth token (persisted) ------------------------------------------------
const TOKEN_KEY = 'nova_token';
const USER_KEY = 'nova_user';

export const auth = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } },
  set: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
};

async function request(path, options = {}) {
  const token = auth.token();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    // Session expired/invalid — drop to login.
    auth.clear();
    window.dispatchEvent(new Event('nova-logout'));
  }
  if (!res.ok) {
    let detail;
    try { detail = (await res.json()).error; } catch { detail = res.statusText; }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  // Auth
  needsBootstrap: () => request('/api/auth/needs-bootstrap'),
  bootstrap: (body) => request('/api/auth/bootstrap', { method: 'POST', body: JSON.stringify(body) }),
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  changePassword: (newPassword) => request('/api/change-password', { method: 'POST', body: JSON.stringify({ newPassword }) }),
  // Users (admin)
  listUsers: () => request('/api/users'),
  createUser: (body) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  // Agents
  listAgents: () => request('/api/agents'),
  // Customers
  getCustomer: (phone) => request(`/api/customer/${encodeURIComponent(phone)}`),
  // Calls
  callsToday: () => request('/api/calls/today'),
  getCall: (callId) => request(`/api/call/${encodeURIComponent(callId)}`),
  saveNotes: (callId, notes) => request('/api/call-notes', { method: 'POST', body: JSON.stringify({ callId, notes }) }),
  // Real-time client -> server actions (SSE is server -> client only)
  acceptCall: (callId, agentId) => request('/api/call-accepted', { method: 'POST', body: JSON.stringify({ callId, agentId }) }),
  acceptChat: (chatId, agentId) => request('/api/chat-accepted', { method: 'POST', body: JSON.stringify({ chatId, agentId }) }),
  // Chat conversation
  chatMessages: (sessionId) => request(`/api/chat/${encodeURIComponent(sessionId)}/messages`),
  replyChat: (sessionId, text, agentName) => request(`/api/chat/${encodeURIComponent(sessionId)}/reply`, { method: 'POST', body: JSON.stringify({ text, agentName }) }),
  summarizeChat: (sessionId) => request(`/api/chat/${encodeURIComponent(sessionId)}/summarize`, { method: 'POST' }),
  // Stats
  statistics: () => request('/api/statistics'),
  health: () => request('/health'),
};

/**
 * Real-time stream via Server-Sent Events (token passed in the query string
 * since EventSource can't set headers). EventSource auto-reconnects.
 */
export function connectStream({ onMessage, onStatus }) {
  const token = auth.token();
  const es = new EventSource(`${API_URL}/api/stream?token=${encodeURIComponent(token || '')}`);
  es.onopen = () => onStatus?.('open');
  es.onmessage = (e) => {
    try { onMessage?.(JSON.parse(e.data)); } catch { /* heartbeat / malformed */ }
  };
  es.onerror = () => onStatus?.('closed');
  return { close: () => es.close() };
}
