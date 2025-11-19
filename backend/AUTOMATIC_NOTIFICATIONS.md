# Automatic Notifications - How It Works

## ✅ Automatic Schedule

Your Money Mind backend automatically sends notifications on a schedule:

### 1. Budget Alerts (Every 6 Hours)
- **Schedule:** Every 6 hours
- **Cron:** `0 */6 * * *`
- **What it does:**
  - Checks all budgets
  - Sends WhatsApp alert when spending reaches 80% of budget
  - Sends urgent alert when budget is exceeded (over 100%)
- **Status:** ✅ Active when server is running

### 2. Monthly Reports (1st of Each Month)
- **Schedule:** 1st of each month at 9:00 AM
- **Cron:** `0 9 1 * *`
- **What it does:**
  - Generates financial summary for previous month
  - Calculates income, expenses, savings
  - Shows top transactions and category breakdown
  - Sends via WhatsApp to all users with phone numbers
- **Status:** ✅ Active when server is running

## 🔄 How It Works

The automatic system uses **cron jobs** that run in the background:

```javascript
// Budget alerts - every 6 hours
cron.schedule("0 */6 * * *", async () => {
  console.log("⏰ Running scheduled budget alert...");
  await checkBudgetAlerts();
});

// Monthly reports - 1st of month at 9 AM
cron.schedule("0 9 1 * *", async () => {
  console.log("⏰ Running monthly report...");
  await sendMonthlyReports();
});
```

## 📋 Requirements for Automatic Notifications

### For Budget Alerts:
1. ✅ Server must be running
2. ✅ User must have budgets set up
3. ✅ User must have phone number in database
4. ✅ User must have joined WhatsApp Sandbox (for testing)

### For Monthly Reports:
1. ✅ Server must be running
2. ✅ User must have transactions in the previous month
3. ✅ User must have phone number in database
4. ✅ User must have joined WhatsApp Sandbox (for testing)

## 🚀 Keeping Server Running

### Development:
```bash
npm run dev
```
- Uses `nodemon` to auto-restart on changes
- Cron jobs run automatically

### Production:
```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start index.js --name money-mind-backend
pm2 save
pm2 startup

# Or using systemd (Linux)
# Or using Windows Task Scheduler (Windows)
# Or using a cloud service (Heroku, Railway, etc.)
```

## 📱 What Users Receive

### Budget Alerts:
- **80% Warning:** "You've used 80% of your [Category] budget"
- **100%+ Exceeded:** "🚨 Budget Exceeded: [Category]"

### Monthly Reports:
- Financial summary for previous month
- Top 5 transactions
- Category-wise spending breakdown
- Savings rate and net savings

## ⚙️ Manual Triggers (For Testing)

You can also trigger notifications manually:

```bash
# Budget alerts
curl -X POST http://localhost:5000/api/notifications/check-budgets

# Monthly reports
curl -X POST http://localhost:5000/api/notifications/send-monthly-reports
```

## 🔍 Monitoring

Check server logs to see when notifications run:

```
⏰ Running scheduled budget alert...
🔔 Checking budget alerts...
✅ Budget alert sent via WhatsApp to +919876543210 for Food & Dining
✅ Budget alert check completed
```

## ⚠️ Important Notes

1. **Server Must Be Running:** Cron jobs only work when the server is active
2. **Timezone:** Uses server's local timezone
3. **WhatsApp Sandbox:** For testing, users must join the sandbox
4. **Phone Numbers:** Must be stored in Supabase user metadata

## 🎯 Next Steps

1. ✅ Keep your server running 24/7 (use PM2 or cloud service)
2. ✅ Add phone numbers to user profiles
3. ✅ Users join WhatsApp Sandbox (for testing)
4. ✅ Set up production WhatsApp Business API (for production)

## 📊 Example Timeline

**Budget Alert:**
- User spends 80% of "Food & Dining" budget
- Next check (within 6 hours) detects it
- WhatsApp alert sent automatically

**Monthly Report:**
- November ends
- December 1st at 9:00 AM
- System generates report for November
- WhatsApp report sent to all users

---

**Everything is automatic!** Just keep the server running and users will receive notifications on schedule. 🎉

