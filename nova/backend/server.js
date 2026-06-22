/**
 * HeyVacay Nova — Service Command Center backend
 *
 * Responsibilities:
 *   - Zoom Phone webhooks (incoming/ended calls) with HMAC signature verification
 *   - Crisp chat webhooks (incoming messages) → alarm broadcast
 *   - REST API for agents, customers, calls, statistics, notes
 *   - WebSocket fan-out to connected agent browsers (real-time)
 *   - Async transcription pipeline: Zoom recording → AssemblyAI → Claude summary
 *
 * Secrets are read from the environment only (see .env.example). Nothing is
 * hardcoded; the Anthropic key never leaves this process.
 */

'use strict';

require('dotenv').config();

const http = require('http');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { WebSocketServer, WebSocket } = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { AssemblyAI } = require('assemblyai');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

// ---------------------------------------------------------------------------
// Configuration & startup validation
// ---------------------------------------------------------------------------
const {
  NODE_ENV = 'development',
  PORT = 3000,
  FRONTEND_URL = 'http://localhost:5173',
  ZOOM_ACCOUNT_ID,
  ZOOM_CLIENT_ID,
  ZOOM_CLIENT_SECRET,
  ZOOM_WEBHOOK_SECRET,
  ASSEMBLYAI_API_KEY,
  CRISP_WEBSITE_ID,
  CRISP_API_USER_ID,
  CRISP_API_TOKEN,
  SUPABASE_URL,
  SUPABASE_KEY,
  ANTHROPIC_API_KEY,
} = process.env;

/** Warn loudly about anything missing instead of failing silently later. */
function checkEnv() {
  const required = [
    'SUPABASE_URL', 'SUPABASE_KEY', 'ANTHROPIC_API_KEY',
    'ASSEMBLYAI_API_KEY', 'ZOOM_WEBHOOK_SECRET',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(`[startup] Missing env vars (features depending on them will fail): ${missing.join(', ')}`);
  }
}
checkEnv();

// ---------------------------------------------------------------------------
// Service clients (guarded so the server still boots with partial config)
// ---------------------------------------------------------------------------
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      // Node < 22 has no global WebSocket; supabase-realtime needs one. We
      // never use realtime here, but createClient initializes it regardless,
      // so hand it the `ws` implementation to avoid a startup crash.
      realtime: { transport: WebSocket },
    })
  : null;

const assemblyAI = ASSEMBLYAI_API_KEY ? new AssemblyAI({ apiKey: ASSEMBLYAI_API_KEY }) : null;

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

// Allow one or more frontend origins (comma-separated in FRONTEND_URL), any
// *.vercel.app deployment, plus localhost during development.
const allowedOrigins = new Set([
  ...String(FRONTEND_URL).split(',').map((s) => s.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://localhost:3000',
]);

function isAllowedOrigin(origin) {
  // Non-browser callers (curl, server-to-server webhooks) send no Origin.
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    if (new URL(origin).hostname.endsWith('.vercel.app')) return true;
  } catch { /* malformed origin */ }
  return false;
}

app.use(cors({
  // cb(null, false) omits the CORS header (browser blocks) without throwing 500.
  origin(origin, cb) { cb(null, isAllowedOrigin(origin)); },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Capture the raw body for webhook routes so we can verify HMAC signatures
// against the exact bytes Zoom/Crisp signed.
app.use(express.json({
  verify(req, _res, buf) { req.rawBody = buf; },
}));

// Basic rate limiting: 100 requests/min/IP on the API surface.
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ---------------------------------------------------------------------------
// WebSocket server — real-time fan-out to agent browsers
// ---------------------------------------------------------------------------
const server = http.createServer(app);
// Attach the WebSocket server to the same HTTP server so it shares one port.
// This is required by single-port hosts (Railway, Render, Fly): clients connect
// to wss://<api-domain> on the same port as the REST API.
const wss = new WebSocketServer({ server });
/** Map<agentId, WebSocket> of currently-connected agents. */
const connectedAgents = new Map();

wss.on('connection', (ws) => {
  let agentId = null;

  ws.on('message', async (raw) => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }

    switch (data.type) {
      case 'AGENT_CONNECTED':
        agentId = data.agentId;
        if (agentId) connectedAgents.set(agentId, ws);
        broadcastToAgents({ type: 'AGENT_STATUS', data: { agentId, status: 'online' } });
        break;

      case 'CALL_ACCEPTED':
        broadcastToAgents({ type: 'CALL_ASSIGNED', data: { callId: data.callId, assignedTo: agentId } });
        break;

      case 'CHAT_ACCEPTED':
        try { await assignChatToAgent(data.chatId, agentId); } catch (e) { console.error('assignChat', e.message); }
        broadcastToAgents({ type: 'STOP_ALARM' });
        break;

      default:
        break;
    }
  });

  ws.on('close', () => {
    if (agentId) {
      connectedAgents.delete(agentId);
      broadcastToAgents({ type: 'AGENT_STATUS', data: { agentId, status: 'offline' } });
    }
  });

  ws.on('error', (e) => console.error('[ws] client error', e.message));
});

/** Send a JSON message to every connected agent socket. */
function broadcastToAgents(message) {
  const payload = JSON.stringify(message);
  for (const ws of connectedAgents.values()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------
function requireSupabase() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

/** Find a customer by phone, creating a bare record if none exists. */
async function lookupCustomer(phone, { create = true, name } = {}) {
  const db = requireSupabase();
  const { data: existing, error } = await db
    .from('customers').select('*').eq('phone', phone).maybeSingle();
  if (error) throw error;
  if (existing) return existing;
  if (!create) return null;

  const { data: created, error: insertErr } = await db
    .from('customers').insert({ phone, name: name || null }).select().single();
  if (insertErr) throw insertErr;
  return created;
}

/** Most recent calls for a phone number. */
async function getPreviousCallHistory(phone, limit = 5) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('call_history').select('*')
    .eq('customer_phone', phone)
    .order('call_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Assemble the full context object the frontend renders for a caller. */
async function assembleCustomerContext(phone) {
  const db = requireSupabase();
  const customer = await lookupCustomer(phone);
  const [prefsRes, bookingsRes, calls] = await Promise.all([
    db.from('customer_preferences').select('*').eq('customer_id', customer.id).maybeSingle(),
    db.from('bookings').select('*').eq('customer_id', customer.id).order('check_in', { ascending: true }),
    getPreviousCallHistory(phone, 5),
  ]);
  return {
    customer,
    preferences: prefsRes.data || null,
    bookings: bookingsRes.data || [],
    calls,
  };
}

// ---------------------------------------------------------------------------
// Zoom integration
// ---------------------------------------------------------------------------
let zoomToken = { value: null, expiresAt: 0 };

/** Server-to-Server OAuth token, cached until ~1 minute before expiry. */
async function getZoomAccessToken() {
  if (zoomToken.value && Date.now() < zoomToken.expiresAt) return zoomToken.value;
  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
    throw new Error('Zoom OAuth not configured');
  }
  const basic = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const { data } = await axios.post('https://zoom.us/oauth/token', null, {
    params: { grant_type: 'account_credentials', account_id: ZOOM_ACCOUNT_ID },
    headers: { Authorization: `Basic ${basic}` },
  });
  zoomToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return zoomToken.value;
}

/** Resolve a downloadable recording URL for AssemblyAI from a recording id. */
async function getRecordingUrl(recordingId, token) {
  const { data } = await axios.get(
    `https://api.zoom.us/v2/phone/recordings/${recordingId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data.download_url || data.url || null;
}

/**
 * Verify a Zoom webhook signature.
 * Zoom signs: "v0:" + timestamp + ":" + rawBody  with HMAC-SHA256(secret).
 * Header format: "v0=<hex>". Also handles the URL-validation challenge.
 */
function verifyZoomSignature(req) {
  if (!ZOOM_WEBHOOK_SECRET) return false;
  const signature = req.header('x-zm-signature');
  const ts = req.header('x-zm-request-timestamp');
  if (!signature || !ts || !req.rawBody) return false;
  const message = `v0:${ts}:${req.rawBody.toString('utf8')}`;
  const hash = crypto.createHmac('sha256', ZOOM_WEBHOOK_SECRET).update(message).digest('hex');
  const expected = `v0=${hash}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Crisp integration
// ---------------------------------------------------------------------------
function crispAuthHeader() {
  const basic = Buffer.from(`${CRISP_API_USER_ID}:${CRISP_API_TOKEN}`).toString('base64');
  return { Authorization: `Basic ${basic}`, 'X-Crisp-Tier': 'plugin' };
}

/** Assign a Crisp conversation to an agent (stops the alarm everywhere). */
async function assignChatToAgent(chatId, agentId) {
  if (!CRISP_WEBSITE_ID || !CRISP_API_TOKEN) return;
  await axios.patch(
    `https://api.crisp.chat/v1/website/${CRISP_WEBSITE_ID}/conversation/${chatId}/routing`,
    { assigned: { user_id: agentId } },
    { headers: crispAuthHeader() },
  );
  if (supabase) {
    await supabase.from('chat_history')
      .update({ agent_id: agentId, status: 'assigned' })
      .eq('crisp_chat_id', chatId);
  }
}

/** Count unassigned (pending) chats. */
async function getPendingChatCount() {
  if (!supabase) return 0;
  const { count } = await supabase
    .from('chat_history')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  return count || 0;
}

// ---------------------------------------------------------------------------
// Claude — call summarization
// ---------------------------------------------------------------------------
/** Pull the concatenated text from a Claude response (ignores thinking blocks). */
function extractText(message) {
  return (message.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

async function generateCallSummary(transcript, customer) {
  if (!anthropic) throw new Error('Anthropic not configured');
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    messages: [{
      role: 'user',
      content: `You are summarizing a HeyVacay travel-agency customer service call.

Customer: ${customer?.name || 'Unknown'}
Transcript:
"""
${transcript.slice(0, 6000)}
"""

Produce a clear, well-structured summary with these sections:
1. Call Summary (2-3 sentences)
2. Topics Discussed (bullets)
3. Customer Sentiment (happy / neutral / upset)
4. Recommended Actions (bullets)
5. Suggested Upsells (bullets with rough $ value)`,
    }],
  });
  return extractText(message);
}

// ---------------------------------------------------------------------------
// Transcription pipeline (async, fire-and-forget after a call ends)
// ---------------------------------------------------------------------------
async function transcribeRecording({ callId, recordingUrl, customerPhone }) {
  if (!assemblyAI) { console.warn('[transcribe] AssemblyAI not configured'); return; }
  try {
    const transcript = await assemblyAI.transcripts.transcribe({
      audio: recordingUrl,
      speaker_labels: true,
      sentiment_analysis: true,
      entity_detection: true,
      punctuate: true,
      format_text: true,
      word_boost: ['HeyVacay', 'Amanyara', 'resort', 'booking', 'Bonvoy', 'Caribbean'],
    });

    if (transcript.status === 'error') {
      console.error('[transcribe] failed:', transcript.error);
      return;
    }

    const customer = await lookupCustomer(customerPhone, { create: false }).catch(() => null);
    const summary = await generateCallSummary(transcript.text || '', customer);

    const sentiment = transcript.sentiment_analysis_results?.[0]?.sentiment || null;

    if (supabase) {
      await supabase.from('call_history').update({
        transcript: transcript.text,
        summary,
        sentiment,
        entities: transcript.entities || null,
        speakers: transcript.utterances || null,
        transcribed_at: new Date().toISOString(),
      }).eq('zoom_call_id', callId);
    }

    broadcastToAgents({ type: 'TRANSCRIPTION_COMPLETE', data: { callId, summary, sentiment } });
  } catch (err) {
    console.error('[transcribe] error:', err.message);
  }
}

// ===========================================================================
// WEBHOOK: Zoom Phone
// ===========================================================================
app.post('/webhook/zoom-phone', async (req, res) => {
  // Zoom URL validation handshake (sent when you save the endpoint URL).
  if (req.body?.event === 'endpoint.url_validation') {
    const plainToken = req.body.payload?.plainToken;
    const encryptedToken = crypto
      .createHmac('sha256', ZOOM_WEBHOOK_SECRET || '')
      .update(plainToken)
      .digest('hex');
    return res.json({ plainToken, encryptedToken });
  }

  if (!verifyZoomSignature(req)) {
    return res.status(401).json({ error: 'invalid signature' });
  }

  const { event, payload } = req.body || {};
  // Acknowledge fast; do the work asynchronously so Zoom doesn't time out.
  res.json({ status: 'received' });

  try {
    switch (event) {
      case 'phone.caller_incoming':
      case 'phone.callee_incoming': {
        const obj = payload?.object || {};
        const phone = obj.caller?.phone_number || obj.callee?.phone_number;
        if (!phone) break;
        const context = await assembleCustomerContext(phone);
        broadcastToAgents({
          type: 'INCOMING_CALL',
          data: {
            callId: obj.call_id || obj.id,
            phone,
            callerName: obj.caller?.name || context.customer.name || 'Unknown',
            timestamp: payload?.timestamp || Date.now(),
            isRepeat: context.calls.length > 0,
            customer: context.customer,
            previousCalls: context.calls,
            preferences: context.preferences,
            bookings: context.bookings,
          },
        });
        break;
      }

      case 'phone.caller_call_log_completed':
      case 'phone.callee_call_log_completed': {
        const obj = payload?.object || {};
        const phone = obj.caller?.phone_number || obj.callee?.phone_number || obj.phone_number;
        const callId = obj.call_id || obj.id;
        const customer = phone ? await lookupCustomer(phone).catch(() => null) : null;

        if (supabase) {
          await supabase.from('call_history').upsert({
            zoom_call_id: callId,
            customer_id: customer?.id || null,
            customer_phone: phone,
            duration_seconds: obj.duration || null,
            status: 'completed',
            call_date: new Date(payload?.timestamp || Date.now()).toISOString(),
          }, { onConflict: 'zoom_call_id' });
        }

        // Kick off transcription if a recording exists.
        if (obj.recording_id || obj.has_recording) {
          try {
            const token = await getZoomAccessToken();
            const url = await getRecordingUrl(obj.recording_id, token);
            if (url) transcribeRecording({ callId, recordingUrl: url, customerPhone: phone });
          } catch (e) {
            console.error('[zoom] recording fetch failed:', e.message);
          }
        }

        broadcastToAgents({ type: 'CALL_ENDED', data: { callId } });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[zoom-webhook] handler error:', err.message);
  }
});

// ===========================================================================
// WEBHOOK: Crisp chat
// ===========================================================================
app.post('/webhook/crisp-chat', async (req, res) => {
  res.json({ status: 'ok' }); // ack immediately

  try {
    const { event, data } = req.body || {};
    if (event !== 'message:received') return;

    const chatId = data.session_id;
    const email = data.user?.email || null;
    const name = data.user?.nickname || null;
    const text = typeof data.content === 'string' ? data.content : (data.content?.text || '');

    let customer = null;
    if (email && supabase) {
      const { data: found } = await supabase.from('customers').select('*').eq('email', email).maybeSingle();
      customer = found || (await supabase.from('customers').insert({ email, name }).select().single()).data;
    }

    if (supabase) {
      await supabase.from('chat_history').upsert({
        crisp_chat_id: chatId,
        customer_id: customer?.id || null,
        customer_email: email,
        customer_name: name,
        messages: [{ from: 'customer', text, at: new Date().toISOString() }],
        status: 'pending',
      }, { onConflict: 'crisp_chat_id' });
    }

    const pendingChatCount = await getPendingChatCount();

    broadcastToAgents({
      type: 'INCOMING_CHAT',
      shouldPlayAlarm: true,
      pendingChatCount,
      data: { chatId, customer, firstMessage: text, timestamp: Date.now() },
    });
  } catch (err) {
    console.error('[crisp-webhook] handler error:', err.message);
  }
});

// ===========================================================================
// REST API
// ===========================================================================

// --- Customers -------------------------------------------------------------
app.get('/api/customer/:phone', async (req, res) => {
  try {
    const context = await assembleCustomerContext(req.params.phone);
    res.json(context);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Agents ----------------------------------------------------------------
app.get('/api/agents', async (_req, res) => {
  try {
    const db = requireSupabase();
    const { data, error } = await db.from('agents').select('*').order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function isValidEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || ''); }

app.post('/api/agents', async (req, res) => {
  try {
    const { name, email, phone_number, receives_sms = true, receives_calls = true, status = 'offline' } = req.body || {};
    if (!name || !isValidEmail(email) || !phone_number) {
      return res.status(400).json({ error: 'name, valid email, and phone_number are required' });
    }
    const db = requireSupabase();
    const { data, error } = await db.from('agents')
      .insert({ name, email, phone_number, receives_sms, receives_calls, status })
      .select().single();
    if (error) throw error;
    broadcastToAgents({ type: 'AGENT_ADDED', data });
    res.json({ id: data.id, success: true, message: 'Agent added', agent: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/agents/:id', async (req, res) => {
  try {
    const db = requireSupabase();
    const { data, error } = await db.from('agents')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    broadcastToAgents({ type: 'AGENT_UPDATED', data });
    res.json({ success: true, message: 'Agent updated', agent: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/agents/:id', async (req, res) => {
  try {
    const db = requireSupabase();
    // Refuse to delete an agent currently on a call.
    const { data: agent } = await db.from('agents').select('status').eq('id', req.params.id).maybeSingle();
    if (agent?.status === 'busy') {
      return res.status(409).json({ success: false, error: 'Agent is on an active call' });
    }
    const { error } = await db.from('agents').delete().eq('id', req.params.id);
    if (error) throw error;
    broadcastToAgents({ type: 'AGENT_DELETED', data: { id: req.params.id } });
    res.json({ success: true, message: 'Agent deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Calls -----------------------------------------------------------------
app.get('/api/call/:callId', async (req, res) => {
  try {
    const db = requireSupabase();
    const { data, error } = await db.from('call_history')
      .select('*').eq('zoom_call_id', req.params.callId).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'call not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/calls/today', async (_req, res) => {
  try {
    const db = requireSupabase();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data, error } = await db.from('call_history')
      .select('*')
      .gte('call_date', start.toISOString())
      .order('call_date', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/call-notes', async (req, res) => {
  try {
    const { callId, notes } = req.body || {};
    if (!callId) return res.status(400).json({ error: 'callId required' });
    const db = requireSupabase();
    const { error } = await db.from('call_history')
      .update({ agent_notes: notes, updated_at: new Date().toISOString() })
      .eq('zoom_call_id', callId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Statistics ------------------------------------------------------------
app.get('/api/statistics', async (_req, res) => {
  try {
    const db = requireSupabase();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data, error } = await db.from('call_history')
      .select('duration_seconds, sentiment, customer_id')
      .gte('call_date', start.toISOString());
    if (error) throw error;

    const totalCalls = data.length;
    const durations = data.map((c) => c.duration_seconds).filter(Boolean);
    const avgDuration = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const positive = data.filter((c) => c.sentiment === 'POSITIVE' || c.sentiment === 'happy').length;
    const sentimentPct = totalCalls ? Math.round((positive / totalCalls) * 100) : 0;

    // Repeat rate: customers appearing more than once today.
    const counts = {};
    data.forEach((c) => { if (c.customer_id) counts[c.customer_id] = (counts[c.customer_id] || 0) + 1; });
    const repeatCustomers = Object.values(counts).filter((n) => n > 1).length;
    const uniqueCustomers = Object.keys(counts).length || 1;
    const repeatRate = Math.round((repeatCustomers / uniqueCustomers) * 100);

    res.json({ totalCalls, avgDuration, repeatRate, sentimentPct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Health ----------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    connectedAgents: connectedAgents.size,
    services: {
      supabase: !!supabase,
      assemblyai: !!assemblyAI,
      anthropic: !!anthropic,
    },
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
server.listen(Number(PORT), () => {
  console.log(`[nova] HTTP API + WebSocket on :${PORT} (${NODE_ENV})`);
});

module.exports = { app, broadcastToAgents };
