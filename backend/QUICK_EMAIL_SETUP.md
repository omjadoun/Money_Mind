# Quick Email Setup for 2FA

## Problem: No emails are being sent

If you're not receiving 2FA codes via email, the email service is not configured.

## Quick Fix (Gmail - Recommended)

1. **Create `backend/.env` file** (if it doesn't exist)

2. **Add these lines:**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_16_char_app_password
EMAIL_FROM=Money Mind <noreply@moneymind.com>
```

3. **Get Gmail App Password:**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification" (if not already enabled)
   - Go to "App passwords" (search for it)
   - Click "Select app" → Choose "Mail"
   - Click "Select device" → Choose "Other" → Type "Money Mind"
   - Click "Generate"
   - Copy the 16-character password (no spaces)
   - Paste it in `EMAIL_APP_PASSWORD` in your `.env` file

4. **Restart backend server:**
```bash
cd backend
npm start
```

5. **Test email:**
```bash
npm run test:2fa-email
```

## Alternative: Use Console Code

If you can't set up email right now:
- The 2FA code will be shown in the **backend console** (where you ran `npm start`)
- Look for: `🔐 IMPORTANT: 2FA code for [email] is: [6-digit code]`
- Use that code to complete 2FA

## Check Backend Console

When you try to sign in with 2FA enabled, check the backend terminal for:
- `✅ 2FA code sent to [email]: [code]` - Email worked!
- `❌ Failed to send 2FA email` - Email failed, but code is shown below
- `🔐 IMPORTANT: 2FA code for [email] is: [code]` - Use this code!















