import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://wqjmhspderdpgqbeyxit.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create Supabase client only if service key is provided
let supabase = null;
if (supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set. Email notifications will be limited.');
}

// Email transporter configuration
// For production, use a proper email service (Gmail, SendGrid, etc.)
const createTransporter = () => {
  // Using Gmail as example - replace with your email service
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, // Use App Password for Gmail
      },
    });
  }
  
  // For other services (SendGrid, Resend, etc.)
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  
  // Development: Use Ethereal Email for testing
  console.warn('⚠️  No email configuration found. Using console output for development.');
  return {
    sendMail: async (options) => {
      console.log('📧 Email would be sent:', {
        to: options.to,
        subject: options.subject,
        html: options.html?.substring(0, 200) + '...',
      });
      return { messageId: 'dev-' + Date.now() };
    },
  };
};

const transporter = createTransporter();

// Email templates
export const emailTemplates = {
  budgetAlert: (data) => {
    const { userName, category, budgetLimit, spent, percentage, dashboardUrl } = data;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .stat-row:last-child { border-bottom: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Money Mind</h1>
      <p>Budget Alert</p>
    </div>
    <div class="content">
      <h2>Hi ${userName || 'there'}! 👋</h2>
      <p>We wanted to let you know that you're approaching your budget limit for <strong>${category}</strong>.</p>
      
      <div class="alert-box">
        <strong>⚠️ Budget Warning</strong><br>
        You've used <strong>${percentage.toFixed(1)}%</strong> of your budget for this category.
      </div>
      
      <div class="stats">
        <div class="stat-row">
          <span><strong>Category:</strong></span>
          <span>${category}</span>
        </div>
        <div class="stat-row">
          <span><strong>Budget Limit:</strong></span>
          <span>₹${budgetLimit.toLocaleString('en-IN')}</span>
        </div>
        <div class="stat-row">
          <span><strong>Amount Spent:</strong></span>
          <span>₹${spent.toLocaleString('en-IN')}</span>
        </div>
        <div class="stat-row">
          <span><strong>Remaining:</strong></span>
          <span>₹${Math.max(0, budgetLimit - spent).toLocaleString('en-IN')}</span>
        </div>
      </div>
      
      <p>Don't worry! You still have some room, but it's a good time to review your spending.</p>
      
      <a href="${dashboardUrl}" class="button">View Dashboard</a>
      
      <div class="footer">
        <p>You're receiving this because budget alerts are enabled in your account.</p>
        <p><a href="${dashboardUrl}/settings">Manage notification preferences</a></p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  },

  monthlyReport: (data) => {
    const { userName, month, year, totalIncome, totalExpenses, netSavings, savingsRate, budgets, topTransactions, categoryBreakdown, csvUrl, dashboardUrl } = data;
    
    const budgetRows = budgets.map(b => `
      <tr>
        <td>${b.category}</td>
        <td>₹${b.limit.toLocaleString('en-IN')}</td>
        <td>₹${b.spent.toLocaleString('en-IN')}</td>
        <td>${b.percentage.toFixed(1)}%</td>
        <td style="color: ${b.percentage > 100 ? '#dc2626' : b.percentage > 80 ? '#f59e0b' : '#10b981'}">
          ${b.percentage > 100 ? '⚠️ Over' : b.percentage > 80 ? '⚡ Near Limit' : '✅ On Track'}
        </td>
      </tr>
    `).join('');

    const topTransactionsRows = topTransactions.map(t => `
      <tr>
        <td>${t.description}</td>
        <td>${t.category}</td>
        <td style="color: ${t.type === 'income' ? '#10b981' : '#dc2626'}">
          ${t.type === 'income' ? '+' : '-'}₹${Math.abs(t.amount).toLocaleString('en-IN')}
        </td>
        <td>${new Date(t.date).toLocaleDateString('en-IN')}</td>
      </tr>
    `).join('');

    const categoryRows = categoryBreakdown.map(c => `
      <tr>
        <td>${c.name}</td>
        <td>₹${c.amount.toLocaleString('en-IN')}</td>
        <td>${c.percentage.toFixed(1)}%</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .summary-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
    .summary-card { background: white; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
    .summary-card .amount { font-size: 28px; font-weight: bold; margin: 10px 0; }
    .summary-card.income .amount { color: #10b981; }
    .summary-card.expense .amount { color: #dc2626; }
    .summary-card.savings .amount { color: #667eea; }
    table { width: 100%; border-collapse: collapse; background: white; margin: 20px 0; border-radius: 8px; overflow: hidden; }
    th { background: #667eea; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    tr:last-child td { border-bottom: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 10px 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    .section { margin: 30px 0; }
    .section h3 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Money Mind</h1>
      <p>Monthly Financial Report - ${month} ${year}</p>
    </div>
    <div class="content">
      <h2>Hi ${userName || 'there'}! 👋</h2>
      <p>Here's your complete financial summary for <strong>${month} ${year}</strong>. Great job staying on top of your finances! 📊</p>
      
      <div class="summary-cards">
        <div class="summary-card income">
          <h3>Total Income</h3>
          <div class="amount">₹${totalIncome.toLocaleString('en-IN')}</div>
        </div>
        <div class="summary-card expense">
          <h3>Total Expenses</h3>
          <div class="amount">₹${totalExpenses.toLocaleString('en-IN')}</div>
        </div>
        <div class="summary-card savings">
          <h3>Net Savings</h3>
          <div class="amount">₹${netSavings.toLocaleString('en-IN')}</div>
        </div>
        <div class="summary-card">
          <h3>Savings Rate</h3>
          <div class="amount" style="color: ${savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#dc2626'}">
            ${savingsRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div class="section">
        <h3>📋 Budget Performance</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Budget Limit</th>
              <th>Amount Spent</th>
              <th>Usage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${budgetRows || '<tr><td colspan="5" style="text-align: center; color: #666;">No budgets set for this month</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>🏆 Top Transactions</h3>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${topTransactionsRows || '<tr><td colspan="4" style="text-align: center; color: #666;">No transactions this month</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>📊 Category-Wise Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows || '<tr><td colspan="3" style="text-align: center; color: #666;">No expenses this month</td></tr>'}
          </tbody>
        </table>
      </div>

      <div style="margin: 30px 0;">
        <a href="${csvUrl}" class="button">📥 Download CSV Report</a>
        <a href="${dashboardUrl}" class="button">📊 View Dashboard</a>
      </div>
      
      <div class="footer">
        <p>Keep up the great work managing your finances! 💪</p>
        <p><a href="${dashboardUrl}/settings">Manage notification preferences</a></p>
        <p style="margin-top: 20px;">© ${new Date().getFullYear()} Money Mind. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  },
};

// Send email function
export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Money Mind <noreply@moneymind.com>',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Get user email from Supabase
export const getUserEmail = async (userId) => {
  try {
    if (!supabase) {
      console.warn('⚠️  Supabase client not initialized. Cannot fetch user emails.');
      return null;
    }
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) throw error;
    return data?.user?.email || null;
  } catch (error) {
    console.error('Error fetching user email:', error);
    return null;
  }
};

// Get all users for monthly report
export const getAllUsers = async () => {
  try {
    if (!supabase) {
      console.warn('⚠️  Supabase client not initialized. Cannot fetch users.');
      return [];
    }
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    return data?.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

