/**
 * HeyVacay Nova — Service Command Center (agent portal)
 *
 * Single-component portal with a 3-column layout:
 *   - Left:   active agents, add/manage agents, daily metrics
 *   - Center: tabs (Calls / Chats / Active / History / Stats)
 *   - Right:  live customer context for the selected caller/chat
 *
 * Real-time updates arrive over WebSocket; everything else is REST.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, connectWebSocket } from './api.js';

const SITE = 'https://nova.heyvacay.co';
const initials = (name = '') => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
const fmtDuration = (s) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
const sentimentEmoji = (s) => ({ POSITIVE: '😊', happy: '😊', NEGATIVE: '😟', upset: '😟' }[s] || '😐');

// ---------------------------------------------------------------------------
// Alarm: continuous 800↔600Hz tone via Web Audio (no asset needed).
// ---------------------------------------------------------------------------
function useAlarm() {
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);

  const stop = useCallback(() => {
    if (nodesRef.current) {
      try { nodesRef.current.osc.stop(); } catch { /* already stopped */ }
      nodesRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (nodesRef.current) return; // already ringing
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = ctxRef.current || (ctxRef.current = new Ctx());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = 0.15;
    const now = ctx.currentTime;
    // Warble between 800 and 600 Hz forever.
    osc.frequency.setValueAtTime(800, now);
    for (let i = 0; i < 600; i += 1) {
      osc.frequency.setValueAtTime(i % 2 ? 600 : 800, now + i * 0.4);
    }
    osc.start();
    nodesRef.current = { osc, gain };
  }, []);

  useEffect(() => stop, [stop]);
  return { start, stop };
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, kind = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const view = (
    <div className="toasts">
      {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.message}</div>)}
    </div>
  );
  return { push, view };
}

// ===========================================================================
// Main component
// ===========================================================================
export default function Portal() {
  const [agents, setAgents] = useState([]);
  const [tab, setTab] = useState('calls');
  const [wsStatus, setWsStatus] = useState('closed');

  const [incomingCall, setIncomingCall] = useState(null);
  const [pendingChats, setPendingChats] = useState([]);
  const [activeCall, setActiveCall] = useState(null);      // { callId, customer, agent, transcript[], notes }
  const [summary, setSummary] = useState(null);            // { generating, progress, text, sentiment }
  const [callsToday, setCallsToday] = useState([]);
  const [stats, setStats] = useState({ totalCalls: 0, avgDuration: 0, repeatRate: 0, sentimentPct: 0 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddAgent, setShowAddAgent] = useState(false);

  const alarm = useAlarm();
  const { push, view: toastView } = useToasts();
  const wsRef = useRef(null);
  // A stable id for this agent console (would come from auth in production).
  const meRef = useRef(`console-${Math.random().toString(36).slice(2, 8)}`);

  // ---- Initial data load -------------------------------------------------
  const refreshAgents = useCallback(async () => {
    try { setAgents(await api.listAgents()); } catch (e) { push(`Agents: ${e.message}`, 'error'); }
  }, [push]);

  const refreshStats = useCallback(async () => {
    try {
      const [s, calls] = await Promise.all([api.statistics(), api.callsToday()]);
      setStats(s); setCallsToday(calls);
    } catch { /* backend may be offline during dev */ }
  }, []);

  useEffect(() => { refreshAgents(); refreshStats(); }, [refreshAgents, refreshStats]);
  useEffect(() => {
    const t = setInterval(refreshStats, 30000); // live stats refresh
    return () => clearInterval(t);
  }, [refreshStats]);

  // ---- WebSocket ---------------------------------------------------------
  useEffect(() => {
    const conn = connectWebSocket({
      agentId: meRef.current,
      onStatus: setWsStatus,
      onMessage: (msg) => {
        switch (msg.type) {
          case 'INCOMING_CALL':
            setIncomingCall(msg.data);
            setSelectedCustomer(buildContextFromCall(msg.data));
            break;
          case 'INCOMING_CHAT':
            setPendingChats((c) => [{ ...msg.data, waitStart: Date.now() }, ...c]);
            if (msg.shouldPlayAlarm) alarm.start();
            break;
          case 'STOP_ALARM':
            alarm.stop();
            break;
          case 'CALL_ENDED':
            setActiveCall((c) => (c && c.callId === msg.data.callId ? { ...c, ended: true } : c));
            setSummary({ generating: true, progress: 10, text: '', sentiment: null });
            break;
          case 'TRANSCRIPTION_COMPLETE':
            setSummary({ generating: false, progress: 100, text: msg.data.summary, sentiment: msg.data.sentiment });
            refreshStats();
            break;
          case 'AGENT_ADDED':
          case 'AGENT_UPDATED':
          case 'AGENT_DELETED':
          case 'AGENT_STATUS':
            refreshAgents();
            break;
          default:
            break;
        }
      },
    });
    wsRef.current = conn;
    return () => conn.close();
  }, [alarm, refreshAgents, refreshStats]);

  // Drive the fake "generating summary" progress bar until backend completes.
  useEffect(() => {
    if (!summary?.generating) return undefined;
    const t = setInterval(() => {
      setSummary((s) => (s && s.generating ? { ...s, progress: Math.min(s.progress + 7, 95) } : s));
    }, 600);
    return () => clearInterval(t);
  }, [summary?.generating]);

  // ---- Derived header counts --------------------------------------------
  const availableCount = agents.filter((a) => a.status === 'available').length;
  const busyCount = agents.filter((a) => a.status === 'busy').length;

  // ---- Call actions ------------------------------------------------------
  function acceptCall(agentId) {
    if (!incomingCall) return;
    const agent = agents.find((a) => a.id === agentId);
    wsRef.current?.send({ type: 'CALL_ACCEPTED', callId: incomingCall.callId });
    setActiveCall({
      callId: incomingCall.callId,
      customer: incomingCall.customer,
      phone: incomingCall.phone,
      agent: agent?.name || 'You',
      start: Date.now(),
      transcript: [],
      notes: '',
    });
    setIncomingCall(null);
    setTab('active');
  }

  function acceptChat(chat, agentId) {
    wsRef.current?.send({ type: 'CHAT_ACCEPTED', chatId: chat.chatId });
    setPendingChats((c) => c.filter((x) => x.chatId !== chat.chatId));
    alarm.stop();
    push(`Chat assigned to ${agents.find((a) => a.id === agentId)?.name || 'agent'}`);
  }

  // ===========================================================================
  return (
    <div className="app">
      <Header
        availableCount={availableCount}
        busyCount={busyCount}
        pendingChats={pendingChats.length}
        callsToday={stats.totalCalls}
        wsStatus={wsStatus}
      />

      <div className="body">
        {/* LEFT SIDEBAR */}
        <aside className="sidebar">
          <div className="section-title">ACTIVE AGENTS</div>
          {agents.length === 0 && <div className="empty" style={{ padding: 16 }}>No agents yet</div>}
          {agents.map((a) => (
            <div className="agent-card" key={a.id}>
              <div className="avatar sm">{initials(a.name)}</div>
              <div>
                <div className="agent-name">{a.name}</div>
                <div className="agent-meta"><span className={`status-dot dot-${a.status}`} />{a.status}</div>
                <div className="agent-meta">🕐 {a.total_calls_today || 0} calls today</div>
              </div>
            </div>
          ))}

          <button className="btn block" style={{ marginTop: 8 }} onClick={() => setShowAddAgent(true)}>+ Add Agent</button>

          <div className="section-title">TODAY'S METRICS</div>
          <div className="card">
            <div className="ctx-row">Total Calls: <b style={{ color: 'var(--text)' }}>{stats.totalCalls}</b></div>
            <div className="ctx-row">Avg Duration: <b style={{ color: 'var(--text)' }}>{fmtDuration(stats.avgDuration)}</b></div>
            <div className="ctx-row">Repeat Rate: <b style={{ color: 'var(--text)' }}>{stats.repeatRate}%</b></div>
            <div className="ctx-row">Sentiment: <b style={{ color: 'var(--text)' }}>😊 {stats.sentimentPct}% positive</b></div>
          </div>
        </aside>

        {/* CENTER */}
        <main className="center">
          <nav className="tabs">
            <TabButton id="calls" tab={tab} setTab={setTab} label="Calls" badge={incomingCall ? 1 : 0} />
            <TabButton id="chats" tab={tab} setTab={setTab} label="Chats" badge={pendingChats.length} />
            <TabButton id="active" tab={tab} setTab={setTab} label="Active" />
            <TabButton id="history" tab={tab} setTab={setTab} label="History" />
            <TabButton id="stats" tab={tab} setTab={setTab} label="Stats" />
          </nav>

          <div className="tab-content">
            {tab === 'calls' && (
              <CallsTab incomingCall={incomingCall} agents={agents} onAccept={acceptCall} onDecline={() => setIncomingCall(null)} />
            )}
            {tab === 'chats' && (
              <ChatsTab chats={pendingChats} agents={agents} onAccept={acceptChat} />
            )}
            {tab === 'active' && (
              <ActiveTab activeCall={activeCall} summary={summary} onSaveNotes={async (notes) => {
                setActiveCall((c) => ({ ...c, notes }));
                try { await api.saveNotes(activeCall.callId, notes); } catch (e) { push(`Save failed: ${e.message}`, 'error'); }
              }} onNewCall={() => { setActiveCall(null); setSummary(null); setTab('calls'); }} push={push} />
            )}
            {tab === 'history' && <HistoryTab calls={callsToday} onSelect={setSelectedCustomer} />}
            {tab === 'stats' && <StatsTab stats={stats} />}
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="sidebar">
          <div className="section-title">CUSTOMER CONTEXT</div>
          <CustomerContext context={selectedCustomer} onLookup={async (phone) => {
            try { const ctx = await api.getCustomer(phone); setSelectedCustomer(ctx); }
            catch (e) { push(`Lookup failed: ${e.message}`, 'error'); }
          }} />
        </aside>
      </div>

      {showAddAgent && (
        <AddAgentModal
          onClose={() => setShowAddAgent(false)}
          onSaved={(a) => { push('Agent added successfully!'); refreshAgents(); setShowAddAgent(false); }}
          onError={(m) => push(m, 'error')}
        />
      )}
      {toastView}
    </div>
  );
}

// Build a right-sidebar context object from an incoming-call payload.
function buildContextFromCall(data) {
  return {
    customer: data.customer,
    preferences: data.preferences,
    bookings: data.bookings || [],
    calls: data.previousCalls || [],
  };
}

// ===========================================================================
// Header
// ===========================================================================
function Header({ availableCount, busyCount, pendingChats, callsToday, wsStatus }) {
  return (
    <header className="header">
      <a className="logo" href={SITE}>
        <span className="logo-badge">HV</span>
        <span className="logo-text">HeyVacay</span>
      </a>
      <span className="header-title">Service Command Center</span>
      <div className="header-stats">
        <span className="stat green"><b>{availableCount}</b> Available</span>
        <span className="stat red"><b>{busyCount}</b> Busy</span>
        <span className="stat">Pending Chats<span className="badge">{pendingChats}</span></span>
        <span className="stat"><b>{callsToday}</b> Calls Today</span>
        <span className="nova-badge" title={`WebSocket ${wsStatus}`}>
          NOVA {wsStatus === 'open' ? '●' : '○'}
        </span>
        <span className="profile">A</span>
      </div>
    </header>
  );
}

function TabButton({ id, tab, setTab, label, badge = 0 }) {
  return (
    <button className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
      {label}{badge > 0 && <span className="badge">{badge}</span>}
      {tab === id && <span className="tab-underline" />}
    </button>
  );
}

// ===========================================================================
// Tab: Calls
// ===========================================================================
function CallsTab({ incomingCall, agents, onAccept, onDecline }) {
  const [chosenAgent, setChosenAgent] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const available = agents.filter((a) => a.status === 'available');

  if (!incomingCall) return <div className="empty">📞 No incoming calls</div>;

  const c = incomingCall;
  return (
    <div className="incoming">
      <div style={{ color: 'var(--red)', fontWeight: 800, marginBottom: 12 }}>🔴 INCOMING CALL</div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div className="avatar lg">{initials(c.callerName)}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{c.callerName}</div>
          <div style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>{c.phone}</div>
          {c.isRepeat && (
            <div style={{ marginTop: 6 }}>
              <span className="repeat-pill">⭐ REPEAT CUSTOMER</span>{' '}
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{c.previousCalls?.length || 0} previous calls</span>
            </div>
          )}
        </div>
      </div>

      {c.preferences && (
        <div className="card" style={{ marginTop: 14, background: 'var(--panel-2)' }}>
          <div style={{ fontSize: 12, color: 'var(--cyan)', marginBottom: 6, letterSpacing: 1 }}>PREFERENCES</div>
          {c.preferences.preferred_destinations && <div className="ctx-row">🏖️ {JSON.stringify(c.preferences.preferred_destinations)}</div>}
          {c.preferences.budget_range && <div className="ctx-row">💰 {c.preferences.budget_range}</div>}
          {c.preferences.loyalty_programs && <div className="ctx-row">🏅 {JSON.stringify(c.preferences.loyalty_programs)}</div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        {!showSelector ? (
          <>
            <button className="btn" onClick={() => setShowSelector(true)}>Accept</button>
            <button className="btn ghost" onClick={onDecline}>Decline</button>
            <button className="btn ghost" onClick={onDecline}>Call Back Later</button>
          </>
        ) : (
          <>
            <select className="field" style={{ flex: 1 }} value={chosenAgent} onChange={(e) => setChosenAgent(e.target.value)}>
              <option value="">Assign to agent…</option>
              {available.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button className="btn" disabled={!chosenAgent} onClick={() => onAccept(chosenAgent)}>Confirm</button>
          </>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Tab: Chats
// ===========================================================================
function ChatsTab({ chats, agents, onAccept }) {
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const available = agents.filter((a) => a.status === 'available');

  if (chats.length === 0) return <div className="empty">💬 No pending chats</div>;

  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
        <span className="badge">{chats.length}</span> Pending Chats
      </div>
      {chats.map((chat) => {
        const wait = Math.floor((Date.now() - chat.waitStart) / 1000);
        return (
          <div className="chat-card" key={chat.chatId}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>{chat.customer?.name || chat.customer?.email || 'New visitor'}</b>
              <span style={{ color: wait > 60 ? 'var(--red)' : 'var(--muted)', fontSize: 12 }}>Wait: {wait}s</span>
            </div>
            <div style={{ fontStyle: 'italic', color: 'var(--muted)', margin: '6px 0' }}>"{chat.firstMessage}"</div>
            <div className="alarm"><span className="bell">🔔</span> ALARM ACTIVE</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {available.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 13 }}>No available agents</span>}
              {available.map((a) => (
                <button key={a.id} className="btn" onClick={() => onAccept(chat, a.id)}>Accept: {a.name}</button>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ===========================================================================
// Tab: Active session
// ===========================================================================
function ActiveTab({ activeCall, summary, onSaveNotes, onNewCall, push }) {
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState(activeCall?.notes || '');
  const [rating, setRating] = useState(0);

  useEffect(() => { setNotes(activeCall?.notes || ''); }, [activeCall?.callId]);
  useEffect(() => {
    if (!activeCall || activeCall.ended) return undefined;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - activeCall.start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [activeCall]);

  // Auto-save notes every 30s.
  useEffect(() => {
    if (!activeCall) return undefined;
    const t = setInterval(() => onSaveNotes(notes), 30000);
    return () => clearInterval(t);
  }, [notes, activeCall, onSaveNotes]);

  if (!activeCall) return <div className="empty">No active session. Accept a call to begin.</div>;

  return (
    <div className="card cyan-border">
      <div style={{ color: 'var(--red)', fontWeight: 800 }}>{activeCall.ended ? '✓ CALL ENDED' : '🔴 CALL IN PROGRESS'}</div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{activeCall.customer?.name || 'Unknown'}</div>
        <div style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>{activeCall.phone}</div>
        <div className="ctx-row">Agent: {activeCall.agent}</div>
        {!activeCall.ended && <div className="ctx-row">Duration: {fmtDuration(elapsed)}</div>}
      </div>

      {!activeCall.ended && (
        <div style={{ display: 'flex', gap: 10, margin: '14px 0' }}>
          <button className="btn ghost">Mute</button>
          <button className="btn danger" onClick={() => { if (confirm('End this call?')) push('Call ended — generating summary'); }}>End Call</button>
        </div>
      )}

      <div className="section-title">LIVE TRANSCRIPTION (AssemblyAI)</div>
      <div className="transcript">
        {(!activeCall.transcript || activeCall.transcript.length === 0)
          ? <div style={{ color: 'var(--muted)' }}>Transcription will stream here once the call connects…</div>
          : activeCall.transcript.map((line, i) => (
            <div key={i} className={`line ${line.speaker === 'Agent' ? 'agent' : 'customer'}`}>
              <span className="speaker">{line.speaker}:</span>{line.text}
            </div>
          ))}
      </div>

      <div className="section-title">NOTES</div>
      <textarea
        rows={4}
        maxLength={500}
        placeholder="Add call notes…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => onSaveNotes(notes)}
      />
      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>{notes.length}/500</div>

      {summary?.generating && (
        <div style={{ marginTop: 16 }}>
          <div className="section-title">⏳ GENERATING AI SUMMARY…</div>
          <div className="progress"><div style={{ width: `${summary.progress}%` }} /></div>
        </div>
      )}

      {summary && !summary.generating && summary.text && (
        <div className="card cyan-border summary" style={{ marginTop: 16 }}>
          <div style={{ color: 'var(--cyan)', fontWeight: 800, marginBottom: 8 }}>✨ AI CALL SUMMARY {sentimentEmoji(summary.sentiment)}</div>
          {summary.text}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
            <button className="btn" onClick={() => { navigator.clipboard?.writeText(summary.text); push('Summary copied'); }}>Copy</button>
            <span>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} style={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setRating(n)}>{n <= rating ? '⭐' : '☆'}</span>
              ))}
            </span>
            <button className="btn ghost" onClick={onNewCall}>New Call</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Tab: History
// ===========================================================================
function HistoryTab({ calls, onSelect }) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('call_date');
  const [expanded, setExpanded] = useState(null);

  const rows = useMemo(() => {
    let r = calls.filter((c) =>
      !q || (c.customer_phone || '').includes(q) || (c.summary || '').toLowerCase().includes(q.toLowerCase()));
    r = [...r].sort((a, b) => (b[sortKey] > a[sortKey] ? 1 : -1));
    return r;
  }, [calls, q, sortKey]);

  function exportCsv() {
    const header = 'date,phone,duration,sentiment,summary\n';
    const body = rows.map((c) =>
      `${c.call_date || ''},${c.customer_phone || ''},${c.duration_seconds || ''},${c.sentiment || ''},"${(c.summary || '').replace(/"/g, "'")}"`).join('\n');
    const url = URL.createObjectURL(new Blob([header + body], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'call-history.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <input className="field" style={{ flex: 1 }} placeholder="Search by phone or summary…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost" onClick={exportCsv}>Export CSV</button>
      </div>
      {rows.length === 0 ? <div className="empty">No calls yet today</div> : (
        <table>
          <thead>
            <tr>
              <th onClick={() => setSortKey('call_date')}>Date</th>
              <th>Customer</th>
              <th onClick={() => setSortKey('duration_seconds')}>Duration</th>
              <th>Sentiment</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <React.Fragment key={c.id}>
                <tr onClick={() => setExpanded(expanded === c.id ? null : c.id)} style={{ cursor: 'pointer' }}>
                  <td>{c.call_date ? new Date(c.call_date).toLocaleString() : '—'}</td>
                  <td>{c.customer_phone}</td>
                  <td>{fmtDuration(c.duration_seconds)}</td>
                  <td>{sentimentEmoji(c.sentiment)}</td>
                  <td>{(c.summary || '').slice(0, 40)}{(c.summary || '').length > 40 ? '…' : ''}</td>
                </tr>
                {expanded === c.id && (
                  <tr><td colSpan={5} style={{ background: 'var(--ink)' }}>
                    <div className="summary" style={{ padding: 8 }}>{c.summary || 'No summary available'}</div>
                    {c.agent_notes && <div className="ctx-row" style={{ padding: 8 }}>📝 {c.agent_notes}</div>}
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

// ===========================================================================
// Tab: Stats
// ===========================================================================
function StatsTab({ stats }) {
  return (
    <div className="kpi-grid">
      <div className="kpi"><div className="label">Total Calls Today</div><div className="value">{stats.totalCalls}</div></div>
      <div className="kpi"><div className="label">Avg Duration</div><div className="value">{fmtDuration(stats.avgDuration)}</div></div>
      <div className="kpi"><div className="label">Repeat Customer %</div><div className="value">{stats.repeatRate}%</div></div>
      <div className="kpi"><div className="label">Customer Sentiment</div><div className="value">{stats.sentimentPct}% 😊</div></div>
    </div>
  );
}

// ===========================================================================
// Right sidebar: customer context
// ===========================================================================
function CustomerContext({ context, onLookup }) {
  const [phone, setPhone] = useState('');
  if (!context) {
    return (
      <div>
        <div className="empty" style={{ padding: 20 }}>👤 No customer selected</div>
        <div className="field">
          <label>Search by phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 555-5555"
            onKeyDown={(e) => e.key === 'Enter' && onLookup(phone)} />
        </div>
        <button className="btn block" onClick={() => onLookup(phone)}>Look up</button>
      </div>
    );
  }
  const { customer, preferences, bookings, calls } = context;
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div className="avatar md" style={{ margin: '0 auto' }}>{initials(customer?.name)}</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginTop: 8 }}>{customer?.name || 'Unknown'}</div>
        <div className="ctx-row">{customer?.email}</div>
        <div className="ctx-row" style={{ fontFamily: 'monospace' }}>{customer?.phone}</div>
        {customer?.is_vip && <span className="repeat-pill">⭐ VIP</span>}
      </div>

      {preferences && (
        <div className="ctx-section">
          <h4>PREFERENCES</h4>
          {preferences.budget_range && <div className="ctx-row">Budget: {preferences.budget_range}</div>}
          {preferences.special_notes && <div className="ctx-row">{preferences.special_notes}</div>}
        </div>
      )}

      {bookings?.length > 0 && (
        <div className="ctx-section">
          <h4>ACTIVE BOOKINGS</h4>
          {bookings.map((b) => (
            <div className="ctx-row" key={b.id}>
              <b style={{ color: 'var(--text)' }}>{b.hotel_name}</b><br />
              {b.check_in} → {b.check_out} · {b.room_type} · ${b.total_cost} {b.status === 'confirmed' ? '✓' : ''}
            </div>
          ))}
        </div>
      )}

      {calls?.length > 0 && (
        <div className="ctx-section">
          <h4>CALL HISTORY ({calls.length})</h4>
          {calls.map((c) => (
            <div className="ctx-row" key={c.id}>
              {c.call_date ? new Date(c.call_date).toLocaleDateString() : '—'} · {fmtDuration(c.duration_seconds)} {sentimentEmoji(c.sentiment)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Add Agent modal
// ===========================================================================
function AddAgentModal({ onClose, onSaved, onError }) {
  const [form, setForm] = useState({ name: '', email: '', phone_number: '', receives_sms: true, receives_calls: true, status: 'offline' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !form.phone_number) {
      onError('Please provide a name, valid email, and phone number'); return;
    }
    setSaving(true);
    try { const r = await api.addAgent(form); onSaved(r.agent); }
    catch (e) { onError(`Failed to add agent: ${e.message}`); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Agent</h3>
        <div className="field"><label>Name *</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="field"><label>Email *</label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
        <div className="field"><label>Phone *</label><input placeholder="+1(555)555-5555" value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} /></div>
        <div className="toggle-row"><span>Receive SMS Alerts</span>
          <input type="checkbox" checked={form.receives_sms} onChange={(e) => set('receives_sms', e.target.checked)} /></div>
        <div className="toggle-row"><span>Receive Call Alerts</span>
          <input type="checkbox" checked={form.receives_calls} onChange={(e) => set('receives_calls', e.target.checked)} /></div>
        <div className="field"><label>Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="offline">Offline</option><option value="available">Available</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit} disabled={saving}>{saving ? <><span className="spinner" /> Saving…</> : 'Add Agent'}</button>
        </div>
      </div>
    </div>
  );
}
