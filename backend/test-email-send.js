// Quick test script to send a test email
// Run with: node test-email-send.js

import { sendEmail, emailTemplates } from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

const testEmail = async () => {
  console.log('🧪 Testing email sending...\n');
  
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
  
  console.log(`📧 Sending test email to: ${testEmailAddress}\n`);

  // Test 1: Simple test email
  console.log('Test 1: Sending simple test email...');
  const simpleResult = await sendEmail(
    testEmailAddress,
    '🧪 Money Mind - Test Email',
    `
    <h2>Test Email from Money Mind</h2>
    <p>If you received this email, your email configuration is working correctly! ✅</p>
    <p>Time: ${new Date().toLocaleString()}</p>
    `
  );
  
  if (simpleResult.success) {
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${simpleResult.messageId}\n`);
  } else {
    console.error('❌ Failed to send test email:', simpleResult.error);
    return;
  }

  // Test 2: Budget alert email template
  console.log('Test 2: Sending budget alert email template...');
  const budgetAlertHtml = emailTemplates.budgetAlert({
    userName: 'Test User',
    category: 'Food & Dining',
    budgetLimit: 5000,
    spent: 4200,
    percentage: 84,
    dashboardUrl: 'http://localhost:5173/budget',
  });

  const alertResult = await sendEmail(
    testEmailAddress,
    '💰 Budget Alert: Food & Dining - 84% Used',
    budgetAlertHtml
  );

  if (alertResult.success) {
    console.log('✅ Budget alert email sent successfully!');
    console.log(`   Message ID: ${alertResult.messageId}\n`);
  } else {
    console.error('❌ Failed to send budget alert:', alertResult.error);
  }

  console.log('\n📬 Check your email inbox (and spam folder) for the test emails!');
};

testEmail().catch(console.error);


