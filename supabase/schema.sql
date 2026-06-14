-- Run this in your Supabase SQL editor to set up the tables

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  twilio_phone TEXT UNIQUE NOT NULL,
  services JSONB NOT NULL DEFAULT '[]',
  business_hours JSONB NOT NULL DEFAULT '{}',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  customer_phone TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_businesses_twilio_phone ON businesses(twilio_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_business_customer ON conversations(business_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments(business_id);
