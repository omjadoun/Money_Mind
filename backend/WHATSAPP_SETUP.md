# WhatsApp Notifications Setup Guide

This guide will help you set up WhatsApp notifications for Money Mind using Twilio's WhatsApp API.

## Prerequisites

1. A Twilio account (sign up at https://www.twilio.com)
2. A verified phone number in Twilio
3. WhatsApp Business API access (or Twilio Sandbox for testing)

## Step 1: Create a Twilio Account

1. Go to https://www.twilio.com and sign up for a free account
2. Verify your email and phone number
3. You'll receive $15.50 in free credits to get started

## Step 2: Get Your Twilio Credentials

1. Log in to your Twilio Console: https://console.twilio.com
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Copy these values (you'll need them for the `.env` file)

## Step 3: Set Up WhatsApp Sandbox (For Testing)

1. In Twilio Console, go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow the instructions to join the WhatsApp Sandbox
3. Send the join code to the Twilio WhatsApp number (e.g., `join <code>`)
4. Once joined, you can send messages to your phone number via the sandbox

## Step 4: Get Your WhatsApp Number

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Search for a number with WhatsApp capabilities
3. Purchase the number (or use the sandbox number for testing)
4. The WhatsApp number format will be: `whatsapp:+14155238886`

## Step 5: Configure Environment Variables

Add these to your `backend/.env` file:

```env
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Supabase Configuration (keep existing)
SUPABASE_URL=https://wqjmhspderdpgqbeyxit.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Dashboard URL
DASHBOARD_URL=http://localhost:5173
```

## Step 6: Install Dependencies

```bash
cd backend
npm install
```

This will install the `twilio` package.

## Step 7: Store User Phone Numbers

Users need to have their phone numbers stored in Supabase. The system will look for phone numbers in:
1. `user.phone` field
2. `user.user_metadata.phone`
3. `user.user_metadata.phone_number`

### Option A: Add Phone During Sign Up
Update your sign-up form to collect phone numbers and store them in user metadata.

### Option B: Add Phone to Existing Users
You can add phone numbers to existing users via Supabase Dashboard or API.

## Step 8: Test WhatsApp Notifications

### Test Budget Alert:
```bash
npm run test:budget-alert
```

### Test Monthly Report:
```bash
npm run test:monthly-report
```

Or manually trigger:
```bash
curl -X POST http://localhost:5000/api/notifications/check-budgets
```

## Phone Number Format

The system automatically formats phone numbers to E.164 format:
- Removes non-digit characters
- Adds country code (defaults to +91 for India)
- Formats as: `whatsapp:+919876543210`

## WhatsApp Message Templates

The system includes three message templates:
1. **Budget Alert**: Sent when budget reaches 80% threshold
2. **Budget Exceeded**: Sent when budget exceeds 100%
3. **Monthly Report**: Sent on the 1st of each month

## Production Setup

For production, you'll need:
1. **WhatsApp Business API Approval**: Apply for WhatsApp Business API access through Twilio
2. **Verified Business**: Your business needs to be verified by WhatsApp
3. **Template Messages**: For production, you'll need to create approved message templates

### Twilio WhatsApp Sandbox (Free Testing)
- Works for testing and development
- Limited to numbers you've joined to the sandbox
- No approval needed

### Twilio WhatsApp Business API (Production)
- Requires WhatsApp Business API approval
- Can send to any WhatsApp number
- Requires message templates for most messages
- More expensive but production-ready

## Troubleshooting

### "Twilio client not initialized"
- Check that `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set in `.env`
- Restart your server after adding environment variables

### "Invalid phone number"
- Ensure phone numbers are stored in Supabase
- Check phone number format (should be 10 digits for India, or include country code)

### "Message failed to send"
- Verify you've joined the Twilio WhatsApp Sandbox (for testing)
- Check that `TWILIO_WHATSAPP_FROM` is set correctly
- Ensure your Twilio account has sufficient credits

### "No phone number found for user"
- Add phone numbers to user profiles in Supabase
- Check user metadata fields: `phone`, `phone_number`

## Cost Information

- **Twilio Sandbox**: Free for testing (limited to sandbox numbers)
- **WhatsApp Business API**: 
  - Conversation-based pricing
  - ~$0.005 - $0.09 per message depending on country
  - Free tier available for some use cases

## Support

For issues with:
- **Twilio Setup**: Check Twilio documentation at https://www.twilio.com/docs/whatsapp
- **Phone Number Formatting**: Check the `formatPhoneNumber` function in `whatsappService.js`
- **Message Delivery**: Check Twilio Console → Monitor → Logs

