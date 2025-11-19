# Quick Migration Guide - WhatsApp MFA Tables

## Error Fix: "Could not find the table 'public.whatsapp_mfa_enrollments'"

This error occurs because the database tables haven't been created yet. Follow these steps:

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Migration

1. Copy the entire contents of `backend/migrations/create_whatsapp_mfa_tables.sql`
2. Paste it into the SQL Editor
3. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Tables Were Created

Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('whatsapp_mfa_enrollments', 'whatsapp_mfa_challenges');
```

You should see both tables listed.

### Alternative: Run via Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

Or manually:

```bash
psql -h your-db-host -U postgres -d postgres -f backend/migrations/create_whatsapp_mfa_tables.sql
```

### What This Migration Creates

- `whatsapp_mfa_enrollments` - Stores WhatsApp enrollment attempts
- `whatsapp_mfa_challenges` - Stores OTP challenge requests
- Indexes for performance
- RLS (Row Level Security) policies
- Cleanup functions

After running the migration, restart your backend server and try enabling WhatsApp 2FA again.

