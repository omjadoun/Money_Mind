# Quick WhatsApp Setup - Step by Step

## 🚀 Get Started in 5 Minutes

### Step 1: Create Twilio Account (2 minutes)

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free account (you'll get $15.50 free credit)
3. Verify your email and phone number

### Step 2: Get Your Credentials (1 minute)

1. After logging in, you'll see your **Account SID** and **Auth Token** on the dashboard
2. Copy both values (keep them secret!)

### Step 3: Join WhatsApp Sandbox (1 minute)

1. In Twilio Console, go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. You'll see a message like: "Join <code> to start receiving messages"
3. Open WhatsApp on your phone
4. Send that join code to the Twilio WhatsApp number (shown on the page, usually `+1 415 523 8886`)
5. You'll receive a confirmation message

### Step 4: Get Your WhatsApp Number (30 seconds)

1. After joining the sandbox, note the WhatsApp number format
2. It will be something like: `whatsapp:+14155238886`
3. This is your `TWILIO_WHATSAPP_FROM` value

### Step 5: Add to .env File (1 minute)

Open `backend/.env` file and add these lines:

```env
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Also make sure you have:
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key_here
DASHBOARD_URL=http://localhost:5173
```

**Important:**
- Replace `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual Account SID
- Replace `your_auth_token_here` with your actual Auth Token
- Replace `whatsapp:+14155238886` with your actual Twilio WhatsApp number
- NO spaces around the `=` sign
- NO quotes around the values

### Step 6: Test It! (30 seconds)

Run this command (replace with your phone number):

```bash
npm run test:whatsapp 919876543210
```

Or if you're in PowerShell:
```powershell
node test-whatsapp.js 919876543210
```

**Phone number format:**
- For India: `919876543210` (10 digits, no + sign needed)
- The system will automatically format it

### ✅ Success!

If you see:
```
✅ Test 1 PASSED: Simple message sent successfully!
✅ Test 2 PASSED: Budget alert template sent successfully!
✅ Test 3 PASSED: Budget exceeded template sent successfully!
```

**Check your WhatsApp** - you should receive 3 test messages!

## 🆘 Troubleshooting

### "TWILIO_ACCOUNT_SID is not set"
- Make sure you added the credentials to `.env` file
- Make sure the file is in the `backend` folder
- Restart your terminal/command prompt after editing `.env`

### "Invalid phone number"
- Make sure you joined the Twilio WhatsApp Sandbox
- Check that your phone number is correct (10 digits for India)

### "Message failed to send"
- Verify you joined the sandbox correctly
- Check Twilio Console → Monitor → Logs for errors
- Make sure your Twilio account has credits

### Messages not received
- Check your WhatsApp
- Verify you sent the join code to Twilio
- Check spam/archived messages in WhatsApp

## 📞 Need Help?

1. Check Twilio Console: https://console.twilio.com
2. View logs: Twilio Console → Monitor → Logs
3. See detailed guide: `WHATSAPP_SETUP.md`

## 🎯 Next Steps

Once testing works:
1. Add phone numbers to user profiles in Supabase
2. Test real budget alerts
3. Set up production WhatsApp Business API (optional)

