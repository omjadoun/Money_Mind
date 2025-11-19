// Diagnostic script to check .env file loading
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Checking .env file configuration...\n');

// Check if .env file exists
const envPath = join(__dirname, '.env');
console.log(`📁 Looking for .env at: ${envPath}`);
console.log(`   File exists: ${existsSync(envPath) ? '✅ YES' : '❌ NO'}\n`);

// Try to load .env
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error.message);
} else {
  console.log('✅ .env file loaded successfully\n');
}

// Check environment variables
console.log('📋 Environment Variables:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 Email Configuration:');
console.log(`   EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || '❌ NOT SET'}`);
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ SET (' + process.env.EMAIL_USER.substring(0, 3) + '***)' : '❌ NOT SET'}`);
console.log(`   EMAIL_APP_PASSWORD: ${process.env.EMAIL_APP_PASSWORD ? '✅ SET (' + process.env.EMAIL_APP_PASSWORD.substring(0, 2) + '***)' : '❌ NOT SET'}`);
console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || '❌ NOT SET'}`);
console.log('');
console.log('📱 WhatsApp Configuration:');
console.log(`   TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ SET (' + process.env.TWILIO_ACCOUNT_SID.substring(0, 4) + '***)' : '❌ NOT SET'}`);
console.log(`   TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ SET (' + process.env.TWILIO_AUTH_TOKEN.substring(0, 4) + '***)' : '❌ NOT SET'}`);
console.log(`   TWILIO_WHATSAPP_FROM: ${process.env.TWILIO_WHATSAPP_FROM || '❌ NOT SET'}`);
console.log('');
console.log('🗄️  Database Configuration:');
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ NOT SET'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Provide instructions
const missingVars = [];
if (!process.env.TWILIO_ACCOUNT_SID) missingVars.push('TWILIO_ACCOUNT_SID');
if (!process.env.TWILIO_AUTH_TOKEN) missingVars.push('TWILIO_AUTH_TOKEN');
if (!process.env.TWILIO_WHATSAPP_FROM) missingVars.push('TWILIO_WHATSAPP_FROM');

if (missingVars.length > 0) {
  console.log('📝 To set up WhatsApp notifications, add these to your .env file:');
  console.log('');
  console.log('# Twilio WhatsApp Configuration');
  console.log('TWILIO_ACCOUNT_SID=your_account_sid_here');
  console.log('TWILIO_AUTH_TOKEN=your_auth_token_here');
  console.log('TWILIO_WHATSAPP_FROM=whatsapp:+14155238886');
  console.log('');
  console.log('📖 See WHATSAPP_SETUP.md for detailed setup instructions');
  console.log('💡 Get credentials from: https://console.twilio.com');
  console.log('');
}

if (!process.env.EMAIL_USER && !process.env.TWILIO_ACCOUNT_SID) {
  console.log('📝 Example .env file structure:');
  console.log('');
  console.log('# Supabase');
  console.log('SUPABASE_URL=https://wqjmhspderdpgqbeyxit.supabase.co');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('');
  console.log('# WhatsApp (Twilio)');
  console.log('TWILIO_ACCOUNT_SID=your_account_sid');
  console.log('TWILIO_AUTH_TOKEN=your_auth_token');
  console.log('TWILIO_WHATSAPP_FROM=whatsapp:+14155238886');
  console.log('');
  console.log('# Dashboard');
  console.log('DASHBOARD_URL=http://localhost:5173');
  console.log('');
  console.log('💡 Tip: Make sure there are NO spaces around the = sign');
  console.log('💡 Tip: Make sure there are NO quotes around the values');
}


