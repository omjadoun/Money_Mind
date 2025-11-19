-- Migration: Create WhatsApp MFA Tables
-- Run this in your Supabase SQL Editor

-- Table to track WhatsApp MFA enrollments
CREATE TABLE IF NOT EXISTS whatsapp_mfa_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL,
  enrollment_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'failed', 'unenrolled')),
  failed_attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Note: Partial unique constraint removed to avoid conflicts
  -- We'll handle duplicate pending enrollments in application logic
);

-- Table to track WhatsApp MFA challenges (OTP requests)
CREATE TABLE IF NOT EXISTS whatsapp_mfa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_id TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  challenge_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
  failed_attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_enrollments_user_id ON whatsapp_mfa_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_enrollments_status ON whatsapp_mfa_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_challenges_user_id ON whatsapp_mfa_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_challenges_status ON whatsapp_mfa_challenges(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_challenges_created_at ON whatsapp_mfa_challenges(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE whatsapp_mfa_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_mfa_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own enrollments/challenges
CREATE POLICY "Users can view own whatsapp enrollments" ON whatsapp_mfa_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own whatsapp challenges" ON whatsapp_mfa_challenges
  FOR SELECT USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_enrollments_updated_at
  BEFORE UPDATE ON whatsapp_mfa_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at_column();

CREATE TRIGGER update_whatsapp_challenges_updated_at
  BEFORE UPDATE ON whatsapp_mfa_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at_column();

-- Cleanup function to remove expired records
CREATE OR REPLACE FUNCTION cleanup_expired_whatsapp_mfa()
RETURNS void AS $$
BEGIN
  -- Delete expired enrollments older than 24 hours
  DELETE FROM whatsapp_mfa_enrollments
  WHERE status IN ('expired', 'failed')
    AND created_at < NOW() - INTERVAL '24 hours';
  
  -- Delete expired challenges older than 1 hour
  DELETE FROM whatsapp_mfa_challenges
  WHERE status IN ('expired', 'failed', 'verified')
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

