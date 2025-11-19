import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import twilio from 'twilio';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

console.log('🔍 Checking WhatsApp Setup Status...\n');

if (!accountSid || !authToken) {
  console.error('❌ Twilio credentials not set in .env file');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function checkStatus() {
  try {
    console.log('📱 Twilio WhatsApp Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`From Number: ${whatsappFrom || '❌ NOT SET'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check recent messages
    console.log('📨 Checking recent messages...\n');
    const messages = await client.messages.list({ limit: 5 });
    
    if (messages.length === 0) {
      console.log('ℹ️  No recent messages found.\n');
    } else {
      console.log('Recent Messages:');
      messages.forEach((msg, index) => {
        console.log(`\n${index + 1}. Message SID: ${msg.sid}`);
        console.log(`   To: ${msg.to}`);
        console.log(`   From: ${msg.from}`);
        console.log(`   Status: ${msg.status}`);
        console.log(`   Date: ${msg.dateSent}`);
        if (msg.errorCode) {
          console.log(`   ❌ Error: ${msg.errorCode} - ${msg.errorMessage}`);
        } else {
          console.log(`   ✅ Status: ${msg.status}`);
        }
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Important: WhatsApp Sandbox Setup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('To receive WhatsApp messages, you MUST:');
    console.log('');
    console.log('1. Join the Twilio WhatsApp Sandbox:');
    console.log('   - Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
    console.log('   - Or: Twilio Console → Messaging → Try it out → Send a WhatsApp message');
    console.log('');
    console.log('2. You will see a join code (e.g., "join abc-xyz")');
    console.log('');
    console.log('3. Open WhatsApp on your phone');
    console.log('');
    console.log('4. Send that join code to the Twilio WhatsApp number');
    console.log(`   (Usually: ${whatsappFrom?.replace('whatsapp:', '') || '+1 415 523 8886'})`);
    console.log('');
    console.log('5. You will receive a confirmation message');
    console.log('');
    console.log('6. After joining, you can receive messages!');
    console.log('');
    console.log('⚠️  Note: Sandbox only works for numbers you\'ve joined');
    console.log('⚠️  For production, you need WhatsApp Business API approval\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 20003) {
      console.error('\n💡 This usually means:');
      console.error('   - Invalid Account SID or Auth Token');
      console.error('   - Check your .env file credentials');
    }
  }
}

checkStatus();

