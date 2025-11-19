# WhatsApp Sandbox Setup - Why Codes Aren't Being Received

## The Problem

If you're not receiving WhatsApp codes, it's likely because **you need to join the Twilio WhatsApp Sandbox first**.

Twilio's WhatsApp API uses a sandbox for testing, and you must opt-in before receiving messages.

## Quick Fix: Join Twilio WhatsApp Sandbox

### Step 1: Get Your Sandbox Code

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. You'll see a sandbox code like: `join <your-code>`
4. Copy the code (the part after "join")

### Step 2: Join the Sandbox

1. Open WhatsApp on your phone
2. Send a message to: **+1 415 523 8886**
3. Send: `join <your-sandbox-code>`
   - Example: If code is `abc123`, send: `join abc123`
4. You'll receive a confirmation message

### Step 3: Test Again

After joining:
1. Go back to your Settings page
2. Try enabling WhatsApp 2FA again
3. You should now receive the code!

## Alternative: Test with Script

Run this to test if WhatsApp is working:

```bash
cd backend
npm run test:whatsapp-mfa +917302886984
```

Replace `+917302886984` with your WhatsApp number.

## Common Issues

### Issue 1: "Recipient has not opted in" (Error 21610)

**Solution:** You haven't joined the sandbox. Follow Step 2 above.

### Issue 2: "Invalid phone number" (Error 21211)

**Solution:** 
- Use international format: `+917302886984` (not `+7302886984`)
- Include country code (91 for India)
- Start with `+`

### Issue 3: "WhatsApp Business Account not approved" (Error 63007)

**Solution:** 
- For testing: Use Twilio Sandbox (join first)
- For production: Apply for WhatsApp Business API approval in Twilio Console

### Issue 4: Message sent but not received

**Check:**
1. Did you join the sandbox? (Most common issue)
2. Is your phone number correct?
3. Check Twilio Console → Monitor → Logs → SMS
4. Look for message status (queued, sent, delivered, failed)

## Check Message Status

1. Go to [Twilio Console → Monitor → Logs](https://console.twilio.com/us1/monitor/logs/sms)
2. Look for your recent messages
3. Check the status:
   - **Queued**: Message is waiting to be sent
   - **Sent**: Message was sent to WhatsApp
   - **Delivered**: Message was delivered to recipient
   - **Failed**: Message failed (check error code)

## Production Setup

For production (not sandbox), you need:

1. **WhatsApp Business Account Approval**
   - Apply in Twilio Console
   - Can take several days/weeks
   - Requires business verification

2. **Approved Phone Number**
   - Must be verified with WhatsApp
   - Cannot be a personal number

3. **Message Templates**
   - Pre-approved message templates
   - Cannot send arbitrary messages

## Quick Test

Test if your setup works:

```bash
cd backend
node test-whatsapp-mfa.js +917302886984
```

This will:
- Test Twilio connection
- Send a test code
- Show detailed error messages if it fails

## Still Not Working?

1. **Check backend console** - Look for error messages
2. **Check Twilio Console** - Monitor → Logs → SMS
3. **Verify sandbox joined** - Send "join <code>" to +1 415 523 8886
4. **Check phone number format** - Must be `+917302886984` (with country code)

## Your Current Setup

- ✅ Twilio Account SID: Set
- ✅ Twilio Auth Token: Set  
- ✅ WhatsApp From: `whatsapp:+14155238886` (Sandbox number)
- ❓ Sandbox Joined: **Check this!**

The sandbox number `+14155238886` is Twilio's test number. You must join the sandbox to receive messages from it.

