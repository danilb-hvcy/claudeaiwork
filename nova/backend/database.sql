-- =============================================================================
-- HeyVacay Nova — Supabase schema
-- Run in Supabase dashboard → SQL Editor. Safe to re-run (idempotent-ish:
-- uses IF NOT EXISTS where possible). Requires the pgcrypto/uuid extension.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== AGENTS ====================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'offline',            -- available, busy, break, offline
  receives_sms BOOLEAN DEFAULT true,
  receives_calls BOOLEAN DEFAULT true,
  total_calls_today INTEGER DEFAULT 0,
  average_call_duration_seconds INTEGER,
  customer_satisfaction_score DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== CUSTOMERS ====================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT,
  phone TEXT UNIQUE,
  is_vip BOOLEAN DEFAULT false,
  total_calls INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  last_call_date TIMESTAMPTZ,
  last_chat_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== CUSTOMER PREFERENCES ====================
CREATE TABLE IF NOT EXISTS customer_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  preferred_destinations JSONB,
  budget_range TEXT,
  interests JSONB,
  loyalty_programs JSONB,
  communication_preference TEXT,
  special_notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== BOOKINGS ====================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  hotel_name TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  room_type TEXT,
  total_cost DECIMAL,
  status TEXT DEFAULT 'pending',
  confirmation_number TEXT,
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== CALL HISTORY ====================
CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT,
  summary TEXT,
  sentiment TEXT,
  entities JSONB,
  speakers JSONB,
  call_quality_rating INTEGER,
  agent_notes TEXT,
  zoom_call_id TEXT UNIQUE,
  recording_url TEXT,
  call_date TIMESTAMPTZ,
  transcribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== CHAT HISTORY ====================
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  messages JSONB,
  crisp_chat_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_call_history_customer ON call_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_history_date ON call_history(call_date DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_agent ON call_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_chat_history_customer ON chat_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_status ON chat_history(status);

-- ==================== ROW LEVEL SECURITY ====================
-- The backend uses the service-role key, which bypasses RLS. These policies
-- govern any client (e.g. anon/authenticated) that talks to Supabase directly.
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agents' AND policyname = 'Authenticated read agents') THEN
    CREATE POLICY "Authenticated read agents" ON agents FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Authenticated read customers') THEN
    CREATE POLICY "Authenticated read customers" ON customers FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_history' AND policyname = 'Authenticated read calls') THEN
    CREATE POLICY "Authenticated read calls" ON call_history FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_history' AND policyname = 'Authenticated read chats') THEN
    CREATE POLICY "Authenticated read chats" ON chat_history FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;
