# ⚠️ URGENT: Run Database Migration Now

## The Error You're Seeing

```
Database error: Could not find the table 'public.whatsapp_mfa_enrollments' in the schema cache
```

This means the database tables haven't been created yet. You need to run the migration.

## Quick Fix (3 Steps)

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project (wqjmhspderdpgqbeyxit)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** button

### Step 2: Copy the Migration SQL
Open this file: `backend/migrations/create_whatsapp_mfa_tables.sql`

**OR** copy this SQL directly:

```sql
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
```

### Step 3: Run the Migration
1. Paste the SQL into the Supabase SQL Editor
2. Click **Run** button (or press Ctrl+Enter / Cmd+Enter)
3. Wait for "Success. No rows returned" message

### Step 4: Verify It Worked
Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'whatsapp_mfa%';
```

You should see:
- `whatsapp_mfa_enrollments`
- `whatsapp_mfa_challenges`

### Step 5: Try Again
1. Go back to your Settings page
2. Refresh the page (F5)
3. Try enabling WhatsApp 2FA again
4. The error should be gone!

## Still Getting Errors?

If you still see errors after running the migration:
1. Make sure you clicked "Run" in Supabase SQL Editor
2. Check for any error messages in the SQL Editor
3. Verify the tables exist using the verification query above
4. Restart your backend server: `npm run dev`

## Need Help?

If the migration fails, share:
1. The exact error message from Supabase SQL Editor
2. Screenshot of the SQL Editor after running the migration

