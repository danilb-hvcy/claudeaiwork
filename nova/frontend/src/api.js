// Thin REST + WebSocket client for the Nova backend.
// All endpoints/secrets stay server-side; the browser only knows public URLs.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let detail;
    try { detail = (await res.json()).error; } catch { detail = res.statusText; }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  // Agents
  listAgents: () => request('/api/agents'),
  addAgent: (body) => request('/api/agents', { method: 'POST', body: JSON.stringify(body) }),
  updateAgent: (id, body) => request(`/api/agents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAgent: (id) => request(`/api/agents/${id}`, { method: 'DELETE' }),
  // Customers
  getCustomer: (phone) => request(`/api/customer/${encodeURIComponent(phone)}`),
  // Calls
  callsToday: () => request('/api/calls/today'),
  getCall: (callId) => request(`/api/call/${encodeURIComponent(callId)}`),
  saveNotes: (callId, notes) => request('/api/call-notes', { method: 'POST', body: JSON.stringify({ callId, notes }) }),
  // Real-time client -> server actions (SSE is server -> client only)
  acceptCall: (callId, agentId) => request('/api/call-accepted', { method: 'POST', body: JSON.stringify({ callId, agentId }) }),
  acceptChat: (chatId, agentId) => request('/api/chat-accepted', { method: 'POST', body: JSON.stringify({ chatId, agentId }) }),
  // Stats
  statistics: () => request('/api/statistics'),
  health: () => request('/health'),
};

/**
 * Real-time stream via Server-Sent Events. Works through any proxy/CDN (no
 * WebSocket upgrade needed). EventSource reconnects automatically.
 * Calls onMessage(parsedEvent) per event and onStatus('open'|'closed').
 */
export function connectStream({ onMessage, onStatus }) {
  const es = new EventSource(`${API_URL}/api/stream`);
  es.onopen = () => onStatus?.('open');
  es.onmessage = (e) => {
    try { onMessage?.(JSON.parse(e.data)); } catch { /* heartbeat / malformed */ }
  };
  es.onerror = () => onStatus?.('closed'); // EventSource retries on its own
  return { close: () => es.close() };
}
