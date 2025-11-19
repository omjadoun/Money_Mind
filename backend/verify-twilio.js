import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

console.log('🔍 Verifying Twilio Configuration...\n');

// Check each credential
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

console.log('📋 Current Configuration:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`TWILIO_ACCOUNT_SID: ${accountSid ? '✅ SET (' + accountSid.substring(0, 4) + '***)' : '❌ NOT SET'}`);
console.log(`TWILIO_AUTH_TOKEN: ${authToken ? '✅ SET (' + authToken.substring(0, 4) + '***)' : '❌ NOT SET'}`);
console.log(`TWILIO_WHATSAPP_FROM: ${whatsappFrom || '❌ NOT SET'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!accountSid || !authToken || !whatsappFrom) {
  console.log('❌ Missing Twilio credentials!\n');
  console.log('📝 Add these to your backend/.env file:\n');
  console.log('# Twilio WhatsApp Configuration');
  console.log('TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  console.log('TWILIO_AUTH_TOKEN=your_auth_token_here');
  console.log('TWILIO_WHATSAPP_FROM=whatsapp:+14155238886');
  console.log('\n💡 Get credentials from: https://console.twilio.com');
  console.log('📖 See SETUP_WHATSAPP_NOW.md for step-by-step instructions\n');
  process.exit(1);
}

// Validate format
if (!accountSid.startsWith('AC')) {
  console.log('⚠️  Warning: TWILIO_ACCOUNT_SID should start with "AC"');
}

if (!whatsappFrom.startsWith('whatsapp:+')) {
  console.log('⚠️  Warning: TWILIO_WHATSAPP_FROM should start with "whatsapp:+"');
  console.log('   Example: whatsapp:+14155238886');
}

console.log('✅ All Twilio credentials are set!');
console.log('🚀 You can now test WhatsApp messages with:');
console.log('   node test-whatsapp.js <your_phone_number>\n');

