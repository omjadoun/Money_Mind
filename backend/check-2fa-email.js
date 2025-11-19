import dotenv from 'dotenv';
import { sendEmail, emailTemplates } from './services/emailService.js';

dotenv.config();

const test2FAEmail = async () => {
  console.log('🧪 Testing 2FA email sending...\n');
  
  // Check if email is configured
  if (!process.env.EMAIL_USER) {
    console.error('❌ Email not configured!');
    console.log('\n📝 Please add to your backend/.env file:');
    console.log('EMAIL_SERVICE=gmail');
    console.log('EMAIL_USER=your_email@gmail.com');
    console.log('EMAIL_APP_PASSWORD=your_app_password');
    console.log('EMAIL_FROM=Money Mind <noreply@moneymind.com>');
    return;
  }

  // Get test email from command line or use EMAIL_USER
  const testEmailAddress = process.argv[2] || process.env.EMAIL_USER;
  
  console.log(`📧 Sending test 2FA email to: ${testEmailAddress}\n`);

  // Generate a test code
  const testCode = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`🔐 Test 2FA Code: ${testCode}\n`);

  // Test 1: 2FA Setup email
  console.log('Test 1: Sending 2FA setup email...');
  const setupHtml = emailTemplates.twoFactorAuth({ 
    code: testCode, 
    userName: 'Test User' 
  });
  
  const setupResult = await sendEmail(
    testEmailAddress,
    '🔐 Money Mind - Two-Factor Authentication Setup (Test)',
    setupHtml
  );
  
  if (setupResult.success) {
    console.log('✅ 2FA setup email sent successfully!');
    console.log(`   Message ID: ${setupResult.messageId}\n`);
  } else {
    console.error('❌ Failed to send 2FA setup email:', setupResult.error);
    return;
  }

  // Test 2: 2FA Sign-in email
  console.log('Test 2: Sending 2FA sign-in email...');
  const signInHtml = emailTemplates.twoFactorAuthSignIn({ 
    code: testCode, 
    userName: 'Test User' 
  });
  
  const signInResult = await sendEmail(
    testEmailAddress,
    '🔐 Money Mind - Sign-In Verification Code (Test)',
    signInHtml
  );
  
  if (signInResult.success) {
    console.log('✅ 2FA sign-in email sent successfully!');
    console.log(`   Message ID: ${signInResult.messageId}\n`);
  } else {
    console.error('❌ Failed to send 2FA sign-in email:', signInResult.error);
    return;
  }

  console.log('✅ All 2FA email tests completed successfully!');
  console.log(`\n📧 Check your inbox at: ${testEmailAddress}`);
  console.log(`🔐 Test code used: ${testCode}`);
};

test2FAEmail().catch(console.error);















