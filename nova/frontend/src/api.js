// Thin REST + WebSocket client for the Nova backend.
// All endpoints/secrets stay server-side; the browser only knows public URLs.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

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
  // Stats
  statistics: () => request('/api/statistics'),
  health: () => request('/health'),
};

/**
 * Auto-reconnecting WebSocket. Calls onMessage(parsedEvent) for each frame
 * and onStatus('open'|'closed') on connection state changes.
 */
export function connectWebSocket({ agentId, onMessage, onStatus }) {
  let ws;
  let closedByUser = false;
  let retry = 0;

  function open() {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      retry = 0;
      onStatus?.('open');
      ws.send(JSON.stringify({ type: 'AGENT_CONNECTED', agentId }));
    };
    ws.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)); } catch { /* ignore malformed */ }
    };
    ws.onclose = () => {
      onStatus?.('closed');
      if (!closedByUser) {
        retry += 1;
        setTimeout(open, Math.min(1000 * 2 ** retry, 16000)); // exp backoff, cap 16s
      }
    };
    ws.onerror = () => ws.close();
  }
  open();

  return {
    send: (msg) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg)),
    close: () => { closedByUser = true; ws?.close(); },
  };
}
