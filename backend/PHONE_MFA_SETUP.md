# Phone MFA Setup Guide

Complete guide for setting up Phone-based Multi-Factor Authentication (MFA) using Supabase and Twilio.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Twilio Setup](#twilio-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Backend Setup](#backend-setup)
5. [Database Migration](#database-migration)
6. [Environment Variables](#environment-variables)
7. [API Endpoints](#api-endpoints)
8. [Client-Side Integration](#client-side-integration)
9. [Costs & Rate Limiting](#costs--rate-limiting)
10. [Recovery Codes](#recovery-codes)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ and npm
- Supabase project with Authentication enabled
- Twilio account with SMS capabilities
- Express.js backend server

## Twilio Setup

### 1. Create Twilio Account

1. Sign up at [twilio.com](https://www.twilio.com)
2. Verify your phone number
3. Get a phone number (or use Messaging Service)

### 2. Get Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Go to **Messaging** → **Services** → Create a Messaging Service
4. Get your **Messaging Service SID**

### 3. Configure Messaging Service

1. Add your Twilio phone number to the Messaging Service
2. Set up fallback numbers if needed
3. Configure delivery status callbacks (optional)

**Note:** For production, use a Messaging Service instead of a single phone number for better deliverability and compliance.

## Supabase Configuration

### Option 1: Use Supabase Phone Auth Provider (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Phone** provider
4. Configure Twilio settings:
   - **Account SID**: Your Twilio Account SID
   - **Auth Token**: Your Twilio Auth Token
   - **Messaging Service SID**: Your Messaging Service SID

### Option 2: Custom Implementation (This Guide)

If you prefer full control over the MFA flow, use the custom implementation provided in this guide. This allows you to:
- Customize OTP messages
- Implement custom rate limiting
- Track enrollment and challenge attempts
- Add additional security measures

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install twilio @supabase/supabase-js express
```

### 2. Add Routes to Your Express App

In your `index.js` or main server file:

```javascript
import phoneMfaRoutes from './routes/phoneMfaRoutes.js';

// Add this before your other routes
app.use('/api/phone-mfa', phoneMfaRoutes);
```

### 3. Install Twilio Package

```bash
npm install twilio
```

## Database Migration

### Run the Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `backend/migrations/create_phone_mfa_tables.sql`
5. Run the query

This creates:
- `phone_mfa_enrollments` table (tracks enrollment attempts)
- `phone_mfa_challenges` table (tracks OTP challenges)
- Indexes for performance
- RLS policies for security
- Cleanup functions

## Environment Variables

Add these to your `backend/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Security Note:** Never commit `.env` files to version control. Use environment variables in production.

## API Endpoints

### 1. Enroll Phone Number

**POST** `/api/phone-mfa/enroll-phone`

Request body:
```json
{
  "user_id": "uuid",
  "phone": "+1234567890"
}
```

Response:
```json
{
  "success": true,
  "enrollmentId": "uuid",
  "challengeId": "uuid",
  "phoneNumber": "+1234567890",
  "expiresAt": "2024-01-01T12:00:00Z",
  "message": "OTP sent to phone number"
}
```

### 2. Verify Phone Enrollment

**POST** `/api/phone-mfa/verify-phone-enroll`

Request body:
```json
{
  "user_id": "uuid",
  "code": "123456",
  "challenge_id": "uuid"
}
```

### 3. Request Phone Challenge

**POST** `/api/phone-mfa/challenge-phone`

Request body:
```json
{
  "user_id": "uuid"
}
```

### 4. Verify Phone Challenge

**POST** `/api/phone-mfa/verify-phone-challenge`

Request body:
```json
{
  "user_id": "uuid",
  "code": "123456",
  "challenge_id": "uuid"
}
```

### 5. Get Phone MFA Status

**GET** `/api/phone-mfa/phone-mfa-status/:user_id`

### 6. Unenroll Phone Factor

**DELETE** `/api/phone-mfa/unenroll-phone`

Request body:
```json
{
  "user_id": "uuid",
  "factor_id": "factor_id_from_supabase"
}
```

## Client-Side Integration

See `backend/examples/phoneMfaClientExample.js` for complete examples.

### Basic Usage

```javascript
import { enrollPhoneMFA, verifyPhoneEnrollment } from './phoneMfaClientExample.js';

// Enroll phone
const enrollment = await enrollPhoneMFA('+1234567890');

// Verify enrollment code
const verified = await verifyPhoneEnrollment(enrollment.challengeId, '123456');
```

## Costs & Rate Limiting

### Twilio SMS Costs

- **US/Canada**: ~$0.0075 per SMS
- **International**: Varies by country ($0.01 - $0.10+)
- **Premium numbers**: Higher costs

**Example:** 1,000 users × 2 SMS per month = 2,000 SMS × $0.0075 = **$15/month**

### Rate Limiting Implementation

The service includes basic rate limiting:
- **Challenge requests**: Max 5 per 15 minutes per user
- **Verification attempts**: Max 5 failed attempts per challenge
- **Enrollment**: One pending enrollment per user

### Recommended Rate Limits

For production, consider:

1. **Per User Limits:**
   - Max 10 challenges per day
   - Max 3 challenges per hour
   - Max 5 verification attempts per challenge

2. **Global Limits:**
   - Max 100 challenges per hour (all users)
   - IP-based rate limiting for abuse prevention

3. **Implementation:**

```javascript
// Add to your rate limiting middleware
import rateLimit from 'express-rate-limit';

const phoneMfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/phone-mfa/challenge-phone', phoneMfaLimiter);
```

## Recovery Codes

### Why Recovery Codes?

If a user loses their phone, they need a way to recover access. Recovery codes are one-time-use backup codes.

### Implementation

1. **Generate Recovery Codes on Enrollment:**

```javascript
function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    return Array.from({ length: 8 }, () => 
      Math.floor(Math.random() * 10)
    ).join('');
  });
}

// Store in database (encrypted)
const codes = generateRecoveryCodes();
await supabase
  .from('recovery_codes')
  .insert(
    codes.map(code => ({
      user_id: userId,
      code: hashCode(code), // Hash before storing
      used: false
    }))
  );
```

2. **Verify Recovery Code:**

```javascript
async function verifyRecoveryCode(userId, code) {
  const hashedCode = hashCode(code);
  const { data } = await supabase
    .from('recovery_codes')
    .select('*')
    .eq('user_id', userId)
    .eq('code', hashedCode)
    .eq('used', false)
    .single();
  
  if (data) {
    // Mark as used
    await supabase
      .from('recovery_codes')
      .update({ used: true, used_at: new Date() })
      .eq('id', data.id);
    
    return true;
  }
  return false;
}
```

3. **Show Codes to User:**

Display recovery codes once during enrollment and allow users to regenerate them.

## Troubleshooting

### Issue: OTP Not Received

**Check:**
1. Twilio credentials are correct
2. Phone number is in E.164 format (+1234567890)
3. Twilio account has sufficient balance
4. Messaging Service is configured correctly
5. Check Twilio logs in console

### Issue: "Too many requests"

**Solution:** Wait 15 minutes or implement higher rate limits

### Issue: "Invalid code"

**Check:**
1. Code hasn't expired (10 minutes)
2. Code is entered correctly
3. Not too many failed attempts (max 5)

### Issue: Database errors

**Check:**
1. Migration was run successfully
2. RLS policies allow service role access
3. Tables exist in Supabase

### Issue: Supabase MFA errors

**Check:**
1. User is authenticated
2. Factor exists and is verified
3. Using correct factor ID
4. Supabase MFA is enabled in project settings

## Security Best Practices

1. **Never expose service role key** in client-side code
2. **Hash recovery codes** before storing
3. **Implement rate limiting** to prevent abuse
4. **Log all MFA attempts** for security auditing
5. **Use HTTPS** for all API calls
6. **Validate phone numbers** before sending SMS
7. **Set expiration times** for codes (10 minutes recommended)
8. **Limit failed attempts** to prevent brute force

## Testing

### Test Phone Numbers

Twilio provides test credentials for development:
- Use test Account SID and Auth Token
- Test phone numbers: +15005550006 (valid), +15005550001 (invalid)

### Test Flow

1. Enroll a test phone number
2. Verify enrollment code
3. Request challenge
4. Verify challenge code
5. Test rate limiting
6. Test expiration
7. Test invalid codes

## Support

For issues:
- Check Twilio logs: [Twilio Console](https://console.twilio.com)
- Check Supabase logs: Supabase Dashboard → Logs
- Review backend console for errors
- Check database for enrollment/challenge records

## Next Steps

1. Implement recovery codes
2. Add email notifications for MFA events
3. Add audit logging
4. Implement advanced rate limiting
5. Add phone number verification before enrollment
6. Support multiple phone numbers per user

