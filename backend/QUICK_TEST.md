# Quick WhatsApp Test Guide

## Prerequisites

1. Make sure you have Twilio credentials set up in `.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

2. Join Twilio WhatsApp Sandbox (for testing):
   - Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message
   - Follow instructions to join the sandbox
   - Send the join code to the Twilio WhatsApp number

## Test WhatsApp Messages

### Option 1: Using npm script (Recommended)

```bash
cd backend
npm run test:whatsapp <your_phone_number>
```

Example:
```bash
npm run test:whatsapp 919876543210
```

### Option 2: Direct node command

```bash
cd backend
node test-whatsapp.js <your_phone_number>
```

Example:
```bash
node test-whatsapp.js 919876543210
```

### Option 3: Set phone number in .env

Add to your `.env` file:
```env
TEST_PHONE_NUMBER=919876543210
```

Then run:
```bash
npm run test:whatsapp
```

## Phone Number Format

- Use 10 digits for India (e.g., `919876543210`)
- Or include country code (e.g., `+919876543210`)
- The system will automatically format it correctly

## What the Test Does

The test script will send 3 WhatsApp messages:

1. **Simple Test Message**: Basic message to verify connection
2. **Budget Alert Template**: Example budget warning message
3. **Budget Exceeded Template**: Example over-budget alert

## Expected Output

If successful, you should see:
```
✅ Test 1 PASSED: Simple message sent successfully!
✅ Test 2 PASSED: Budget alert template sent successfully!
✅ Test 3 PASSED: Budget exceeded template sent successfully!
```

## Troubleshooting

### "TWILIO_ACCOUNT_SID is not set"
- Add your Twilio credentials to `.env` file
- Make sure the file is in the `backend` directory

### "Invalid phone number"
- Check that you've joined the Twilio WhatsApp Sandbox
- Verify the phone number format

### "Message failed to send"
- Ensure you've joined the Twilio WhatsApp Sandbox
- Check that `TWILIO_WHATSAPP_FROM` is set correctly
- Verify your Twilio account has credits

### Messages not received
- Check your WhatsApp for messages
- Verify you joined the sandbox correctly
- Check Twilio Console → Monitor → Logs for delivery status

## Next Steps

Once testing is successful:
1. Add phone numbers to user profiles in Supabase
2. Test actual budget alerts by triggering the notification endpoint
3. Set up production WhatsApp Business API (if needed)

