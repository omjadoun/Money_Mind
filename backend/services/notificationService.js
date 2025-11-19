import { createClient } from '@supabase/supabase-js';
import { sendWhatsApp, whatsappTemplates, getUserPhone } from './whatsappService.js';
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
        // Get user phone number
        const userPhone = await getUserPhone(budget.user_id);
        if (!userPhone) {
          console.log(`⚠️  No phone number found for user ${budget.user_id}`);
          continue;
        }

        // Get user name
        const { data: userData } = await supabase.auth.admin.getUserById(budget.user_id);
        const userName = userData?.user?.email?.split('@')[0] || 
                        userData?.user?.user_metadata?.name ||
                        userData?.user?.user_metadata?.first_name ||
                        'there';

        // Send WhatsApp alert
        const whatsappMessage = whatsappTemplates.budgetAlert({
          userName,
          category,
          budgetLimit,
          spent,
          percentage,
          dashboardUrl: `${dashboardUrl}/budget`,
        });

        const result = await sendWhatsApp(userPhone, whatsappMessage);

        if (result.success) {
          console.log(`✅ Budget alert sent via WhatsApp to ${userPhone} for ${category}`);
          sentAlerts.set(alertKey, Date.now());
        } else {
          console.error(`❌ Failed to send WhatsApp alert to ${userPhone}:`, result.error);
        }
      }
      
      // Also check for exceeded budgets (over 100%)
      if (percentage > 100) {
        const exceededKey = `${budget.user_id}_${category}_exceeded`;
        const lastExceededSent = sentAlerts.get(exceededKey);
        const oneHourAgo = Date.now() - 60 * 60 * 1000; // Send every hour for exceeded budgets

        if (!lastExceededSent || lastExceededSent < oneHourAgo) {
          const userPhone = await getUserPhone(budget.user_id);
          if (userPhone) {
            const { data: userData } = await supabase.auth.admin.getUserById(budget.user_id);
            const userName = userData?.user?.email?.split('@')[0] || 
                            userData?.user?.user_metadata?.name ||
                            userData?.user?.user_metadata?.first_name ||
                            'there';
            
            const overAmount = spent - budgetLimit;
            const exceededMessage = whatsappTemplates.budgetExceeded({
              userName,
              category,
              budgetLimit,
              spent,
              overAmount,
              dashboardUrl: `${dashboardUrl}/budget`,
            });

            const result = await sendWhatsApp(userPhone, exceededMessage);
            if (result.success) {
              console.log(`✅ Budget exceeded alert sent via WhatsApp to ${userPhone} for ${category}`);
              sentAlerts.set(exceededKey, Date.now());
            }
          }
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
        const userPhone = user.phone || user.user_metadata?.phone || user.user_metadata?.phone_number;
        
        if (!userPhone) {
          console.log(`⚠️  No phone number found for user ${userId}`);
          continue;
        }

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

        // Send WhatsApp message
        const userName = user.email?.split('@')[0] || 
                        user.user_metadata?.name ||
                        user.user_metadata?.first_name ||
                        'there';
        
        const whatsappMessage = whatsappTemplates.monthlyReport({
          userName,
          month: monthName,
          year,
          totalIncome,
          totalExpenses,
          netSavings,
          savingsRate,
          topTransactions,
          categoryBreakdown,
          dashboardUrl: `${dashboardUrl}/analytics`,
        });

        const result = await sendWhatsApp(userPhone, whatsappMessage);

        if (result.success) {
          console.log(`✅ Monthly report sent via WhatsApp to ${userPhone}`);
        } else {
          console.error(`❌ Failed to send WhatsApp report to ${userPhone}:`, result.error);
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

