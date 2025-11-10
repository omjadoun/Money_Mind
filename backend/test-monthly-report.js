// Test script to send a monthly report email
// Run with: node test-monthly-report.js

import { sendEmail, emailTemplates } from './services/emailService.js';
import { generateMonthlyCSV } from './services/csvService.js';
import dotenv from 'dotenv';

dotenv.config();

const testMonthlyReport = async () => {
  console.log('🧪 Testing Monthly Report Email...\n');
  
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
  
  console.log(`📧 Sending monthly report email to: ${testEmailAddress}\n`);

  // Get last month's data for the report
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthName = lastMonth.toLocaleDateString('en-US', { month: 'long' });
  const year = lastMonth.getFullYear();

  // Test data for monthly report
  const testData = {
    userName: 'Test User',
    month: monthName,
    year: year,
    totalIncome: 50000,
    totalExpenses: 35000,
    netSavings: 15000,
    savingsRate: 30,
    budgets: [
      {
        category: 'Food & Dining',
        limit: 10000,
        spent: 8500,
        percentage: 85,
      },
      {
        category: 'Transportation',
        limit: 5000,
        spent: 4200,
        percentage: 84,
      },
      {
        category: 'Shopping',
        limit: 8000,
        spent: 7200,
        percentage: 90,
      },
      {
        category: 'Bills & Utilities',
        limit: 6000,
        spent: 5800,
        percentage: 96.7,
      },
      {
        category: 'Entertainment',
        limit: 3000,
        spent: 2500,
        percentage: 83.3,
      },
      {
        category: 'Healthcare',
        limit: 4000,
        spent: 2800,
        percentage: 70,
      },
    ],
    topTransactions: [
      {
        description: 'Salary',
        category: 'Income',
        amount: 50000,
        type: 'income',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString(),
      },
      {
        description: 'Grocery Shopping',
        category: 'Food & Dining',
        amount: 3500,
        type: 'expense',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5).toISOString(),
      },
      {
        description: 'Electricity Bill',
        category: 'Bills & Utilities',
        amount: 2800,
        type: 'expense',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 10).toISOString(),
      },
      {
        description: 'Uber Rides',
        category: 'Transportation',
        amount: 2500,
        type: 'expense',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 15).toISOString(),
      },
      {
        description: 'Online Shopping',
        category: 'Shopping',
        amount: 4500,
        type: 'expense',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 18).toISOString(),
      },
      {
        description: 'Restaurant Dinner',
        category: 'Food & Dining',
        amount: 2000,
        type: 'expense',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 22).toISOString(),
      },
      {
        description: 'Movie Tickets',
        category: 'Entertainment',
        amount: 800,
        type: 'expense',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 25).toISOString(),
      },
      {
        description: 'Medical Checkup',
        category: 'Healthcare',
        amount: 1500,
        type: 'expense',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 28).toISOString(),
      },
    ],
    categoryBreakdown: [
      {
        name: 'Food & Dining',
        amount: 8500,
        percentage: 24.3,
      },
      {
        name: 'Shopping',
        amount: 7200,
        percentage: 20.6,
      },
      {
        name: 'Bills & Utilities',
        amount: 5800,
        percentage: 16.6,
      },
      {
        name: 'Transportation',
        amount: 4200,
        percentage: 12.0,
      },
      {
        name: 'Healthcare',
        amount: 2800,
        percentage: 8.0,
      },
      {
        name: 'Entertainment',
        amount: 2500,
        percentage: 7.1,
      },
      {
        name: 'Other',
        amount: 4800,
        percentage: 13.7,
      },
    ],
    dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5173',
  };

  console.log('📊 Test Monthly Report Data:');
  console.log(`   Month: ${testData.month} ${testData.year}`);
  console.log(`   Total Income: ₹${testData.totalIncome.toLocaleString('en-IN')}`);
  console.log(`   Total Expenses: ₹${testData.totalExpenses.toLocaleString('en-IN')}`);
  console.log(`   Net Savings: ₹${testData.netSavings.toLocaleString('en-IN')}`);
  console.log(`   Savings Rate: ${testData.savingsRate}%\n`);

  // Generate CSV content
  const csvContent = generateMonthlyCSV({
    transactions: testData.topTransactions.map(t => ({
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type,
      date: t.date,
    })),
    budgets: testData.budgets,
    totalIncome: testData.totalIncome,
    totalExpenses: testData.totalExpenses,
    netSavings: testData.netSavings,
  });

  // Create CSV data URL
  const csvDataUrl = `data:text/csv;base64,${Buffer.from(csvContent).toString('base64')}`;

  // Generate monthly report email HTML
  const monthlyReportHtml = emailTemplates.monthlyReport({
    ...testData,
    csvUrl: csvDataUrl,
  });

  // Send the email
  const result = await sendEmail(
    testEmailAddress,
    `📊 Your ${testData.month} ${testData.year} Financial Report - Money Mind`,
    monthlyReportHtml
  );

  if (result.success) {
    console.log('✅ Monthly report email sent successfully!');
    console.log(`   Message ID: ${result.messageId}\n`);
    console.log('📬 Check your email inbox (and spam folder) for the monthly report!');
    console.log('📎 The email includes a downloadable CSV file with your financial data.');
  } else {
    console.error('❌ Failed to send monthly report email:', result.error);
  }
};

testMonthlyReport().catch(console.error);

