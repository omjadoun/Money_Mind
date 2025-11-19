# 2FA Email Troubleshooting Guide

If 2FA emails are not being sent, follow these steps:

## 1. Check if Backend Server is Running

Make sure the backend server is running on port 5000:

```bash
cd backend
npm start
# or for development with auto-reload:
npm run dev
```

You should see: `🚀 Server at http://localhost:5000`

## 2. Check Email Configuration

Create or update `backend/.env` file with email settings:

### Option 1: Gmail (Recommended for Development)

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_app_password_here
EMAIL_FROM=Money Mind <noreply@moneymind.com>
```

**To get Gmail App Password:**
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App passwords
4. Create a new app password for "Mail"
5. Use that 16-character password in `EMAIL_APP_PASSWORD`

### Option 2: Custom SMTP

```env
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_password
EMAIL_FROM=Money Mind <noreply@moneymind.com>
```

## 3. Test Email Configuration

Run the test script to verify email is working:

```bash
cd backend
npm run test:2fa-email
# or with a specific email:
node check-2fa-email.js your_email@example.com
```

## 4. Check Backend Logs

When you try to enable 2FA, check the backend console for:
- `✅ 2FA code sent to email@example.com: 123456` (success)
- `❌ Failed to send 2FA email` (failure with error details)
- `📧 DEV MODE: 2FA code for email@example.com is: 123456` (email failed but code shown)

## 5. Development Mode Fallback

If email is not configured, the system will:
- Still generate a 2FA code
- Show the code in the backend console
- Return the code in the API response (check browser console)
- Display the code in a toast notification

**Check your browser console (F12) for the code!**

## 6. Common Issues

### Issue: "Email service not configured"
**Solution:** Add email configuration to `backend/.env` file

### Issue: "Failed to send email" with Gmail
**Solutions:**
- Make sure you're using an App Password, not your regular password
- Check that 2-Step Verification is enabled
- Verify the email address is correct

### Issue: Backend not reachable
**Solutions:**
- Make sure backend is running on port 5000
- Check if `VITE_BACKEND_URL` in frontend `.env` matches backend URL
- Check firewall/antivirus isn't blocking port 5000

### Issue: CORS errors
**Solution:** Backend should have CORS enabled (already configured)

## 7. Verify Frontend-Backend Connection

Check browser console (F12) for:
- Network errors when calling `/api/2fa/send-code`
- CORS errors
- Connection refused errors

## 8. Quick Test

1. Start backend: `cd backend && npm start`
2. Try enabling 2FA in the app
3. Check backend console for the code
4. Check browser console (F12) for the code
5. Check your email inbox (and spam folder)

## Still Not Working?

1. Check backend console for detailed error messages
2. Verify all environment variables are set correctly
3. Test email sending with: `npm run test:2fa-email`
4. Make sure backend server is accessible from frontend















