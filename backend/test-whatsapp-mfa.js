/**
 * Test WhatsApp MFA Service
 * Run this to test if WhatsApp messaging is working
 * 
 * Usage: node test-whatsapp-mfa.js +1234567890
 */

import 'dotenv/config';
import twilio from 'twilio';

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM;

if (!twilioAccountSid || !twilioAuthToken) {
  console.error('❌ Twilio credentials not set in .env');
  process.exit(1);
}

if (!twilioWhatsAppFrom) {
  console.error('❌ TWILIO_WHATSAPP_FROM not set in .env');
  process.exit(1);
}

const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Get phone number from command line or use default
const testNumber = process.argv[2] || '+1234567890';
const testCode = Math.floor(100000 + Math.random() * 900000).toString();

console.log('🧪 Testing WhatsApp MFA Service...\n');
console.log('Configuration:');
console.log(`  Account SID: ${twilioAccountSid.substring(0, 10)}...`);
console.log(`  WhatsApp From: ${twilioWhatsAppFrom}`);
console.log(`  Test Number: ${testNumber}`);
console.log(`  Test Code: ${testCode}\n`);

// Format number
const formattedNumber = testNumber.startsWith('whatsapp:') 
  ? testNumber 
  : `whatsapp:${testNumber}`;

console.log(`📤 Sending test WhatsApp message to ${formattedNumber}...\n`);

twilioClient.messages.create({
  body: `🔐 Your Money Mind verification code is: *${testCode}*\n\nThis code expires in 10 minutes.\n\nDo not share this code with anyone.`,
  from: twilioWhatsAppFrom,
  to: formattedNumber
})
.then(message => {
  console.log('✅ SUCCESS! WhatsApp message sent!');
  console.log(`   Message SID: ${message.sid}`);
  console.log(`   Status: ${message.status}`);
  console.log(`   To: ${message.to}`);
  console.log(`   From: ${message.from}\n`);
  console.log('📱 Check your WhatsApp for the code!\n');
  console.log('⚠️  Important Notes:');
  console.log('   1. If using Twilio Sandbox, you must join first:');
  console.log('      - Send "join <your-sandbox-code>" to +1 415 523 8886');
  console.log('      - Get sandbox code from: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
  console.log('   2. For production, you need an approved WhatsApp Business Account');
  console.log('   3. Check Twilio Console for message status: https://console.twilio.com/us1/monitor/logs/sms\n');
})
.catch(error => {
  console.error('❌ FAILED to send WhatsApp message!\n');
  console.error('Error Details:');
  console.error(`   Code: ${error.code}`);
  console.error(`   Message: ${error.message}`);
  console.error(`   Status: ${error.status}\n`);
  
  if (error.code === 21211) {
    console.error('💡 Solution: Invalid phone number format. Use E.164 format: +1234567890');
  } else if (error.code === 21608) {
    console.error('💡 Solution: You need to join Twilio Sandbox first!');
    console.error('   Send "join <sandbox-code>" to +1 415 523 8886');
    console.error('   Get code from: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
  } else if (error.code === 21610) {
    console.error('💡 Solution: Recipient has not opted in to receive messages from this number');
    console.error('   For sandbox: Send "join <sandbox-code>" to +1 415 523 8886');
  } else if (error.code === 63007) {
    console.error('💡 Solution: WhatsApp Business Account not approved or sandbox not joined');
  } else {
    console.error('💡 Check:');
    console.error('   1. Twilio account is active');
    console.error('   2. Account has sufficient balance');
    console.error('   3. WhatsApp number is correct');
    console.error('   4. For sandbox: You joined the sandbox');
    console.error('   5. Check Twilio Console for more details');
  }
  
  console.error('\n📖 Twilio Console: https://console.twilio.com/us1/monitor/logs/sms');
  process.exit(1);
});

