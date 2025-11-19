import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendWhatsApp, whatsappTemplates } from './services/whatsappService.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Test function
async function testMonthlyReport() {
  console.log('🧪 Testing Monthly Report WhatsApp Message...\n');

  // Get phone number from command line argument
  const testPhone = process.argv[2] || process.env.TEST_PHONE_NUMBER;

  if (!testPhone) {
    console.error('❌ No phone number provided');
    console.log('📝 Usage: node test-monthly-report-whatsapp.js <phone_number>');
    console.log('   Example: node test-monthly-report-whatsapp.js 919876543210');
    return;
  }

  console.log('📱 Test Phone Number:', testPhone);
  console.log('📤 Sending monthly report WhatsApp message...\n');

  try {
    // Create sample monthly report data
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthName = lastMonth.toLocaleDateString('en-US', { month: 'long' });
    const year = lastMonth.getFullYear();

    const sampleData = {
      userName: 'Test User',
      month: monthName,
      year: year,
      totalIncome: 50000,
      totalExpenses: 35000,
      netSavings: 15000,
      savingsRate: 30.0,
      topTransactions: [
        { description: 'Salary', category: 'Income', amount: 50000, type: 'income', date: '2024-10-01' },
        { description: 'Grocery Shopping', category: 'Food & Dining', amount: 5000, type: 'expense', date: '2024-10-15' },
        { description: 'Rent', category: 'Bills & Utilities', amount: 15000, type: 'expense', date: '2024-10-01' },
        { description: 'Transportation', category: 'Transportation', amount: 3000, type: 'expense', date: '2024-10-20' },
        { description: 'Entertainment', category: 'Entertainment', amount: 2000, type: 'expense', date: '2024-10-25' },
      ],
      categoryBreakdown: [
        { name: 'Bills & Utilities', amount: 15000, percentage: 42.9 },
        { name: 'Food & Dining', amount: 8000, percentage: 22.9 },
        { name: 'Transportation', amount: 5000, percentage: 14.3 },
        { name: 'Entertainment', amount: 4000, percentage: 11.4 },
        { name: 'Shopping', amount: 3000, percentage: 8.6 },
      ],
      dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5173',
    };

    const whatsappMessage = whatsappTemplates.monthlyReport(sampleData);

    console.log('📊 Monthly Report Preview:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(whatsappMessage);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const result = await sendWhatsApp(testPhone, whatsappMessage);

    if (result.success) {
      console.log('✅ Monthly report WhatsApp message sent successfully!');
      console.log('   Message ID:', result.messageId);
      console.log('\n📱 Check your WhatsApp to see the monthly report!');
    } else {
      console.error('❌ Failed to send monthly report:', result.error);
      console.log('\n💡 Make sure:');
      console.log('   1. You have joined the Twilio WhatsApp Sandbox');
      console.log('   2. Your phone number is correct');
      console.log('   3. Twilio credentials are set in .env');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testMonthlyReport().catch(console.error);

