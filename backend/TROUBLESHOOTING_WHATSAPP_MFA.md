# Troubleshooting WhatsApp MFA 400 Error

## Common Issues and Solutions

### 1. Table Doesn't Exist Error

**Error:** `Could not find the table 'public.whatsapp_mfa_enrollments'`

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the migration: `backend/migrations/create_whatsapp_mfa_tables.sql`
3. Verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'whatsapp_mfa%';
```

### 2. Twilio Credentials Not Set

**Error:** `Twilio client not initialized` or `TWILIO_WHATSAPP_FROM not configured`

**Solution:**
Check your `backend/.env` file has:
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 3. Database Connection Issues

**Error:** `Database error: ...`

**Solution:**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env`
- Check Supabase project is active
- Verify service role key has proper permissions

### 4. Phone Number Format Issues

**Error:** `Failed to send WhatsApp message`

**Solution:**
- Ensure phone number is in E.164 format: `+1234567890`
- For WhatsApp, it should be: `whatsapp:+1234567890` (service handles this)
- Remove spaces, dashes, parentheses

### 5. Check Backend Logs

The backend now logs detailed information:
- `📱 WhatsApp enrollment request:` - Shows incoming request
- `📝 Storing enrollment in database...` - Database operation
- `❌ Database insert error:` - Database errors with details
- `📤 Sending WhatsApp OTP...` - WhatsApp sending

**To see logs:**
1. Check your terminal where `npm run dev` is running
2. Look for error messages with ❌ or ⚠️

### 6. Verify Migration Ran Successfully

Run this in Supabase SQL Editor:
```sql
-- Check if tables exist
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('whatsapp_mfa_enrollments', 'whatsapp_mfa_challenges')
ORDER BY table_name, ordinal_position;
```

You should see all columns listed.

### 7. Test Database Access

Test if your backend can access the tables:
```sql
-- In Supabase SQL Editor, test insert
INSERT INTO whatsapp_mfa_enrollments (
  user_id, 
  whatsapp_number, 
  enrollment_code, 
  expires_at, 
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'whatsapp:+1234567890',
  '123456',
  NOW() + INTERVAL '10 minutes',
  'pending'
);
```

If this fails, there's a table structure issue.

### 8. Check RLS Policies

If you get permission errors, check RLS policies:
```sql
-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename IN ('whatsapp_mfa_enrollments', 'whatsapp_mfa_challenges');
```

The service role key should bypass RLS, but verify it's set correctly.

## Quick Debug Steps

1. **Check backend console** - Look for error messages
2. **Verify .env file** - All Twilio and Supabase vars set
3. **Run migration** - Ensure tables exist
4. **Test phone number format** - Use `+1234567890` format
5. **Check Twilio account** - Verify account is active and has balance

## Still Having Issues?

1. Share the exact error message from backend console
2. Share the error message from browser console
3. Verify migration was run successfully
4. Check Twilio console for any errors

