// Test script for email notifications
// Run with: node test-notifications.js

const testBudgetAlerts = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/notifications/check-budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    console.log('✅ Budget Alerts Test Result:', data);
  } catch (error) {
    console.error('❌ Error testing budget alerts:', error);
  }
};

const testMonthlyReports = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/notifications/send-monthly-reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    console.log('✅ Monthly Reports Test Result:', data);
  } catch (error) {
    console.error('❌ Error testing monthly reports:', error);
  }
};

// Run tests
console.log('🧪 Testing email notifications...\n');

// Uncomment the test you want to run:
testBudgetAlerts();
// testMonthlyReports();

