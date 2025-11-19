# Monthly Report - WhatsApp Setup

## Overview

The monthly report is **automatically sent via WhatsApp** on the **1st of each month at 9:00 AM**.

## What's Included

The monthly report WhatsApp message includes:

1. **Financial Summary:**
   - Total Income
   - Total Expenses
   - Net Savings
   - Savings Rate

2. **Top 5 Transactions:**
   - Largest transactions from the previous month

3. **Category Breakdown:**
   - Spending by category with percentages

4. **Dashboard Link:**
   - Direct link to view full analytics

## Schedule

- **Frequency:** Once per month
- **Day:** 1st of each month
- **Time:** 9:00 AM (server time)
- **Cron Expression:** `0 9 1 * *`

## Requirements

For users to receive monthly reports:

1. **Phone Number in Database:**
   - Phone number must be stored in Supabase
   - Can be in: `user.phone`, `user.user_metadata.phone`, or `user.user_metadata.phone_number`

2. **WhatsApp Sandbox:**
   - User must have joined the Twilio WhatsApp Sandbox (for testing)
   - Or have WhatsApp Business API access (for production)

## Testing Monthly Reports

### Option 1: Test with Sample Data

```bash
node test-monthly-report-whatsapp.js <phone_number>
```

Example:
```bash
node test-monthly-report-whatsapp.js 919876543210
```

### Option 2: Trigger Real Monthly Report

```bash
# Using curl
curl -X POST http://localhost:5000/api/notifications/send-monthly-reports

# Using PowerShell
Invoke-RestMethod -Uri http://localhost:5000/api/notifications/send-monthly-reports -Method POST

# Using npm script
npm run test:reports
```

**Note:** This will send reports to ALL users who have phone numbers in the database.

## Monthly Report Template

The WhatsApp message format:

```
📊 *Money Mind - Monthly Report*

Hi [User Name]! 👋

Here's your financial summary for *[Month] [Year]*:

💰 *Summary:*
• Total Income: ₹[amount]
• Total Expenses: ₹[amount]
• Net Savings: ₹[amount]
• Savings Rate: [percentage]%

🏆 *Top Transactions:*
• [Transaction 1]
• [Transaction 2]
...

📊 *Category Breakdown:*
• [Category 1]: ₹[amount] ([percentage]%)
• [Category 2]: ₹[amount] ([percentage]%)
...

Keep up the great work managing your finances! 💪

View Dashboard: [dashboard_url]/analytics
```

## Troubleshooting

### "No phone number found for user"
- Add phone numbers to user profiles in Supabase
- Check user metadata fields

### "Message failed to send"
- User must join WhatsApp Sandbox
- Verify phone number format
- Check Twilio account credits

### Reports not sending automatically
- Ensure server is running continuously
- Check cron job is active
- Verify server timezone settings

## Production Setup

For production monthly reports:

1. **WhatsApp Business API:**
   - Apply for WhatsApp Business API through Twilio
   - Get business verification
   - Create message templates

2. **User Phone Numbers:**
   - Collect phone numbers during sign-up
   - Store in Supabase user metadata
   - Verify phone numbers

3. **Scheduling:**
   - Use a process manager (PM2) to keep server running
   - Or use a cloud cron service
   - Consider timezone handling for users

## CSV Export

The monthly report also generates a CSV file with:
- All transactions
- Budget performance
- Financial metrics

Currently, the CSV is included as a data URL. For production, consider:
- Uploading to cloud storage (S3, Supabase Storage)
- Sending download link via WhatsApp
- Or including in email backup

