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
console.log(`EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || '❌ NOT SET'}`);
console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? '✅ SET (' + process.env.EMAIL_USER.substring(0, 3) + '***)' : '❌ NOT SET'}`);
console.log(`EMAIL_APP_PASSWORD: ${process.env.EMAIL_APP_PASSWORD ? '✅ SET (' + process.env.EMAIL_APP_PASSWORD.substring(0, 2) + '***)' : '❌ NOT SET'}`);
console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || '❌ NOT SET'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ NOT SET'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Provide instructions
if (!process.env.EMAIL_USER) {
  console.log('📝 To fix this, create a .env file in the backend folder with:');
  console.log('');
  console.log('EMAIL_SERVICE=gmail');
  console.log('EMAIL_USER=your_email@gmail.com');
  console.log('EMAIL_APP_PASSWORD=your_16_char_app_password');
  console.log('EMAIL_FROM=Money Mind <noreply@moneymind.com>');
  console.log('');
  console.log('💡 Tip: Make sure there are NO spaces around the = sign');
  console.log('💡 Tip: Make sure there are NO quotes around the values');
}


