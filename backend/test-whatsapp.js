import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables FIRST, before importing any services
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Now import the service after env is loaded
import { sendWhatsApp, whatsappTemplates } from './services/whatsappService.js';

// Test function
async function testWhatsApp() {
  console.log('🧪 Testing WhatsApp Integration...\n');

  // Check if required environment variables are set
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.error('❌ TWILIO_ACCOUNT_SID is not set in .env file');
    console.log('📝 Please add TWILIO_ACCOUNT_SID to your .env file');
    return;
  }

  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.error('❌ TWILIO_AUTH_TOKEN is not set in .env file');
    console.log('📝 Please add TWILIO_AUTH_TOKEN to your .env file');
    return;
  }

  if (!process.env.TWILIO_WHATSAPP_FROM) {
    console.error('❌ TWILIO_WHATSAPP_FROM is not set in .env file');
    console.log('📝 Please add TWILIO_WHATSAPP_FROM to your .env file (format: whatsapp:+14155238886)');
    return;
  }

  // Get phone number from command line argument or use default
  const testPhone = process.argv[2] || process.env.TEST_PHONE_NUMBER;

  if (!testPhone) {
    console.error('❌ No phone number provided');
    console.log('📝 Usage: node test-whatsapp.js <phone_number>');
    console.log('   Example: node test-whatsapp.js 919876543210');
    console.log('   Or set TEST_PHONE_NUMBER in .env file');
    return;
  }

  console.log('📱 Test Phone Number:', testPhone);
  console.log('📤 Sending WhatsApp message...\n');

  try {
    // Test 1: Simple test message
    console.log('Test 1: Sending simple test message...');
    const simpleMessage = `🧪 *Money Mind - WhatsApp Test*

Hello! This is a test message from Money Mind.

If you received this message, your WhatsApp integration is working correctly! ✅

Time: ${new Date().toLocaleString()}

---
This is a test message.`;

    const result1 = await sendWhatsApp(testPhone, simpleMessage);
    
    if (result1.success) {
      console.log('✅ Test 1 PASSED: Simple message sent successfully!');
      console.log('   Message ID:', result1.messageId);
    } else {
      console.error('❌ Test 1 FAILED:', result1.error);
      return;
    }

    // Wait a bit before sending next message
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Budget alert template
    console.log('\nTest 2: Sending budget alert template...');
    const budgetAlertMessage = whatsappTemplates.budgetAlert({
      userName: 'Test User',
      category: 'Food & Dining',
      budgetLimit: 5000,
      spent: 4200,
      percentage: 84,
      dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5173',
    });

    const result2 = await sendWhatsApp(testPhone, budgetAlertMessage);
    
    if (result2.success) {
      console.log('✅ Test 2 PASSED: Budget alert template sent successfully!');
      console.log('   Message ID:', result2.messageId);
    } else {
      console.error('❌ Test 2 FAILED:', result2.error);
    }

    // Wait a bit before sending next message
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Budget exceeded template
    console.log('\nTest 3: Sending budget exceeded template...');
    const budgetExceededMessage = whatsappTemplates.budgetExceeded({
      userName: 'Test User',
      category: 'Shopping',
      budgetLimit: 3000,
      spent: 3500,
      overAmount: 500,
      dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5173',
    });

    const result3 = await sendWhatsApp(testPhone, budgetExceededMessage);
    
    if (result3.success) {
      console.log('✅ Test 3 PASSED: Budget exceeded template sent successfully!');
      console.log('   Message ID:', result3.messageId);
    } else {
      console.error('❌ Test 3 FAILED:', result3.error);
    }

    console.log('\n🎉 WhatsApp testing completed!');
    console.log('📱 Check your WhatsApp to see if messages were received.');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testWhatsApp().catch(console.error);

