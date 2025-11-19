# Money Mind Backend - Email Notifications Setup

## Features

- **Budget Alerts**: Automatically sends email alerts when spending reaches 80% of budget limit
- **Monthly Reports**: Sends comprehensive monthly financial reports on the 1st of each month

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Supabase Configuration
SUPABASE_URL=https://wqjmhspderdpgqbeyxit.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Email Configuration
# Option 1: Gmail (Recommended for development)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_app_password_here

# Option 2: Custom SMTP
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=587
# EMAIL_SECURE=false
# EMAIL_USER=your_email@example.com
# EMAIL_PASSWORD=your_password_here

# Email From Address
EMAIL_FROM=Money Mind <noreply@moneymind.com>

# Dashboard URL (for email links)
DASHBOARD_URL=http://localhost:5173

# Server Port
PORT=5000
```

### 3. Gmail Setup (Recommended for Development)

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Create a new app password for "Mail"
   - Use this password in `EMAIL_APP_PASSWORD`

### 4. Production Email Services

For production, consider using:
- **SendGrid**: Professional email service with free tier
- **Resend**: Modern email API
- **AWS SES**: Scalable email service
- **Mailgun**: Developer-friendly email service

### 5. Supabase Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the `service_role` key (keep this secret!)
4. Add it to your `.env` file

### 6. Run the Server

```bash
# Development
npm run dev

# Production
npm start
```

## Scheduled Jobs

- **Budget Alerts**: Checks every 6 hours for budgets at 80% threshold
- **Monthly Reports**: Sends on the 1st of each month at 9:00 AM

## API Endpoints

### Manual Trigger (for testing)

**Option 1: Using curl (Terminal/Command Prompt)**

**For Mac/Linux/Git Bash:**
```bash
# Check budget alerts
curl -X POST http://localhost:5000/api/notifications/check-budgets

# Send monthly reports
curl -X POST http://localhost:5000/api/notifications/send-monthly-reports
```

**For PowerShell (Windows):**
```powershell
# Check budget alerts
Invoke-WebRequest -Uri http://localhost:5000/api/notifications/check-budgets -Method POST

# Or using Invoke-RestMethod (returns JSON directly)
Invoke-RestMethod -Uri http://localhost:5000/api/notifications/check-budgets -Method POST

# Send monthly reports
Invoke-RestMethod -Uri http://localhost:5000/api/notifications/send-monthly-reports -Method POST
```

**Option 2: Using npm scripts**
```bash
# Test budget alerts
npm run test:alerts

# Test monthly reports
npm run test:reports
```

**Option 3: Using the test script**
```bash
# Edit test-notifications.js to uncomment the test you want
node test-notifications.js
```

**Option 4: Using Postman/Insomnia**
- Method: `POST`
- URL: `http://localhost:5000/api/notifications/check-budgets`
- Or: `http://localhost:5000/api/notifications/send-monthly-reports`

## Email Templates

- **2FA Setup**: Email template for two-factor authentication setup
- **2FA Sign-In**: Email template for sign-in verification codes

## Troubleshooting

### 2FA Emails not sending
- Check your email service credentials in `backend/.env`
- Verify SMTP settings
- Check spam folder
- See `QUICK_EMAIL_SETUP.md` for detailed setup instructions
- Review server logs for errors

### Scheduled jobs not running
- Ensure server is running continuously
- For production, use a process manager like PM2
- Consider using a cron service for scheduled tasks

## Security Notes

- Never commit `.env` file to version control
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Use environment-specific email credentials
- Enable email authentication properly

