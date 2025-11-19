# Phone MFA Quick Start Guide

## Quick Setup (5 minutes)

### 1. Install Dependencies (if not already installed)
```bash
cd backend
npm install twilio
```

### 2. Add Environment Variables
Add to `backend/.env`:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Run Database Migration
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `backend/migrations/create_phone_mfa_tables.sql`
3. Run the query

### 4. Restart Backend
```bash
npm run dev
```

## API Endpoints

All endpoints are prefixed with `/api/phone-mfa`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/enroll-phone` | Enroll phone number, sends OTP |
| POST | `/verify-phone-enroll` | Verify enrollment OTP |
| POST | `/challenge-phone` | Request sign-in OTP |
| POST | `/verify-phone-challenge` | Verify sign-in OTP |
| GET | `/phone-mfa-status/:user_id` | Get MFA status |
| DELETE | `/unenroll-phone` | Disable phone MFA |

## Example Usage

### Enroll Phone
```javascript
const response = await fetch('http://localhost:5000/api/phone-mfa/enroll-phone', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-uuid',
    phone: '+1234567890'
  })
});
```

### Verify Enrollment
```javascript
const response = await fetch('http://localhost:5000/api/phone-mfa/verify-phone-enroll', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-uuid',
    code: '123456',
    challenge_id: 'challenge-uuid'
  })
});
```

## Phone Number Format

**Required:** E.164 format
- ✅ `+1234567890` (US)
- ✅ `+441234567890` (UK)
- ❌ `1234567890` (missing +)
- ❌ `(123) 456-7890` (wrong format)

## Costs

- **US/Canada**: ~$0.0075 per SMS
- **1,000 users/month**: ~$15/month (2 SMS per user)

## Rate Limits

- Max 5 challenges per 15 minutes per user
- Max 5 verification attempts per challenge
- Codes expire in 10 minutes

## Troubleshooting

**OTP not received?**
1. Check Twilio credentials
2. Verify phone number format (+1234567890)
3. Check Twilio console for errors
4. Verify account balance

**"Too many requests"?**
- Wait 15 minutes or increase rate limits

See `PHONE_MFA_SETUP.md` for detailed documentation.

