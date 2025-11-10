import { createClient } from '@supabase/supabase-js';
import { sendEmail, emailTemplates, getUserEmail } from './emailService.js';
import { generateMonthlyCSV } from './csvService.js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wqjmhspderdpgqbeyxit.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:5173';

// Create Supabase client only if service key is provided
let supabase = null;
if (supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set. Email notifications will not work.');
}

// Track sent alerts to avoid spam
const sentAlerts = new Map(); // userId_category -> timestamp

// Check budgets and send alerts for 80% threshold
export const checkBudgetAlerts = async () => {
  try {
    if (!supabase) {
      console.error('❌ Supabase client not initialized. Please set SUPABASE_SERVICE_ROLE_KEY in .env');
      return;
    }
    
    console.log('🔔 Checking budget alerts...');
    
    // Get all budgets
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('*');
    
    if (budgetsError) {
      console.error('Error fetching budgets:', budgetsError);
      return;
    }

    if (!budgets || budgets.length === 0) {
      console.log('No budgets found');
      return;
    }

    // Get current month transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'expense')
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .lte('date', endOfMonth.toISOString().split('T')[0]);
    
    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return;
    }

    // Calculate spending by category
    const spendingByCategory = {};
    transactions?.forEach(t => {
      const category = t.category || 'Other';
      spendingByCategory[category] = (spendingByCategory[category] || 0) + parseFloat(t.amount || 0);
    });

    // Check each budget
    for (const budget of budgets) {
      const category = budget.category;
      const budgetLimit = parseFloat(budget.budget_limit || 0);
      const spent = spendingByCategory[category] || 0;
      const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;

      // Check if alert should be sent (80% threshold and not sent recently)
      const alertKey = `${budget.user_id}_${category}`;
      const lastSent = sentAlerts.get(alertKey);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      if (percentage >= 80 && (!lastSent || lastSent < oneDayAgo)) {
        // Get user email
        const userEmail = await getUserEmail(budget.user_id);
        if (!userEmail) {
          console.log(`⚠️  No email found for user ${budget.user_id}`);
          continue;
        }

        // Get user name
        const { data: userData } = await supabase.auth.admin.getUserById(budget.user_id);
        const userName = userData?.user?.email?.split('@')[0] || 'there';

        // Send alert email
        const emailHtml = emailTemplates.budgetAlert({
          userName,
          category,
          budgetLimit,
          spent,
          percentage,
          dashboardUrl: `${dashboardUrl}/budget`,
        });

        const result = await sendEmail(
          userEmail,
          `💰 Budget Alert: ${category} - ${percentage.toFixed(1)}% Used`,
          emailHtml
        );

        if (result.success) {
          console.log(`✅ Budget alert sent to ${userEmail} for ${category}`);
          sentAlerts.set(alertKey, Date.now());
        } else {
          console.error(`❌ Failed to send alert to ${userEmail}:`, result.error);
        }
      }
    }

    console.log('✅ Budget alert check completed');
  } catch (error) {
    console.error('❌ Error checking budget alerts:', error);
  }
};

// Generate and send monthly reports
export const sendMonthlyReports = async () => {
  try {
    if (!supabase) {
      console.error('❌ Supabase client not initialized. Please set SUPABASE_SERVICE_ROLE_KEY in .env');
      return;
    }
    
    console.log('📊 Generating monthly reports...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found');
      return;
    }

    // Get last month's data
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const monthName = lastMonth.toLocaleDateString('en-US', { month: 'long' });
    const year = lastMonth.getFullYear();

    for (const user of users) {
      try {
        const userId = user.id;
        const userEmail = user.email;
        
        if (!userEmail) continue;

        // Get transactions for last month
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .gte('date', lastMonth.toISOString().split('T')[0])
          .lte('date', lastMonthEnd.toISOString().split('T')[0])
          .order('amount', { ascending: false });

        // Get budgets for last month
        const { data: budgets } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId);

        // Calculate metrics
        const incomeTransactions = transactions?.filter(t => t.type === 'income') || [];
        const expenseTransactions = transactions?.filter(t => t.type === 'expense') || [];
        
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const netSavings = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

        // Calculate spending by category
        const categorySpending = {};
        expenseTransactions.forEach(t => {
          const category = t.category || 'Other';
          categorySpending[category] = (categorySpending[category] || 0) + parseFloat(t.amount || 0);
        });

        const categoryBreakdown = Object.entries(categorySpending)
          .map(([name, amount]) => ({
            name,
            amount,
            percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount);

        // Get budget performance
        const budgetPerformance = budgets?.map(budget => {
          const spent = categorySpending[budget.category] || 0;
          const limit = parseFloat(budget.budget_limit || 0);
          const percentage = limit > 0 ? (spent / limit) * 100 : 0;
          
          return {
            category: budget.category,
            limit,
            spent,
            percentage,
          };
        }) || [];

        // Get top 10 transactions
        const topTransactions = transactions?.slice(0, 10).map(t => ({
          description: t.description || 'No description',
          category: t.category || 'Other',
          amount: parseFloat(t.amount || 0),
          type: t.type,
          date: t.date,
        })) || [];

        // Generate CSV
        const csvContent = generateMonthlyCSV({
          transactions: transactions || [],
          budgets: budgetPerformance,
          totalIncome,
          totalExpenses,
          netSavings,
        });

        // In production, upload CSV to storage and get URL
        // For now, we'll include it as a data URL in the email
        const csvDataUrl = `data:text/csv;base64,${Buffer.from(csvContent).toString('base64')}`;

        // Send email
        const userName = userEmail.split('@')[0];
        const emailHtml = emailTemplates.monthlyReport({
          userName,
          month: monthName,
          year,
          totalIncome,
          totalExpenses,
          netSavings,
          savingsRate,
          budgets: budgetPerformance,
          topTransactions,
          categoryBreakdown,
          csvUrl: csvDataUrl,
          dashboardUrl: `${dashboardUrl}/analytics`,
        });

        const result = await sendEmail(
          userEmail,
          `📊 Your ${monthName} ${year} Financial Report - Money Mind`,
          emailHtml
        );

        if (result.success) {
          console.log(`✅ Monthly report sent to ${userEmail}`);
        } else {
          console.error(`❌ Failed to send report to ${userEmail}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.id}:`, error);
      }
    }

    console.log('✅ Monthly reports sent');
  } catch (error) {
    console.error('❌ Error sending monthly reports:', error);
  }
};

