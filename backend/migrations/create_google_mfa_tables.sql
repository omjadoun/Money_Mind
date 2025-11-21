-- Table to store Google Authenticator secrets
CREATE TABLE IF NOT EXISTS google_mfa_secrets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE google_mfa_secrets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own mfa secret" ON google_mfa_secrets
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_google_mfa_secrets_updated_at
  BEFORE UPDATE ON google_mfa_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at_column(); -- Reusing existing function if available, or create new one
