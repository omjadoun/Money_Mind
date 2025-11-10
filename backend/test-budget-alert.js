// Test script to send a budget alert email
// Run with: node test-budget-alert.js

import { sendEmail, emailTemplates } from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

const testBudgetAlert = async () => {
  console.log('🧪 Testing Budget Alert Email...\n');
  
  // Check if email is configured
  if (!process.env.EMAIL_USER) {
    console.error('❌ Email not configured!');
    console.log('\n📝 Please add to your .env file:');
    console.log('EMAIL_SERVICE=gmail');
    console.log('EMAIL_USER=your_email@gmail.com');
    console.log('EMAIL_APP_PASSWORD=your_app_password');
    console.log('EMAIL_FROM=Money Mind <noreply@moneymind.com>');
    return;
  }

  // Get test email from command line or use EMAIL_USER
  const testEmailAddress = process.argv[2] || process.env.EMAIL_USER;
  
  console.log(`📧 Sending budget alert email to: ${testEmailAddress}\n`);

  // Test data for budget alert
  const testData = {
    userName: 'Test User',
    category: 'Food & Dining',
    budgetLimit: 5000,
    spent: 4200, // 84% of budget
    percentage: 84,
    dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5173',
  };

  console.log('📊 Test Budget Data:');
  console.log(`   Category: ${testData.category}`);
  console.log(`   Budget Limit: ₹${testData.budgetLimit.toLocaleString('en-IN')}`);
  console.log(`   Amount Spent: ₹${testData.spent.toLocaleString('en-IN')}`);
  console.log(`   Percentage Used: ${testData.percentage}%\n`);

  // Generate budget alert email HTML
  const budgetAlertHtml = emailTemplates.budgetAlert(testData);

  // Send the email
  const result = await sendEmail(
    testEmailAddress,
    `💰 Budget Alert: ${testData.category} - ${testData.percentage}% Used`,
    budgetAlertHtml
  );

  if (result.success) {
    console.log('✅ Budget alert email sent successfully!');
    console.log(`   Message ID: ${result.messageId}\n`);
    console.log('📬 Check your email inbox (and spam folder) for the budget alert!');
  } else {
    console.error('❌ Failed to send budget alert email:', result.error);
  }
};

testBudgetAlert().catch(console.error);

