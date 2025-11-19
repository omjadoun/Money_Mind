import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables if not already loaded
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = join(__dirname, '../../.env');
  dotenv.config({ path: envPath });
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://wqjmhspderdpgqbeyxit.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create Supabase client only if service key is provided
let supabase = null;
if (supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set. WhatsApp notifications will be limited.');
}

// Initialize Twilio client (lazy initialization)
let twilioClient = null;
let twilioInitialized = false;

const initializeTwilio = () => {
  if (twilioInitialized) {
    return twilioClient;
  }
  
  twilioInitialized = true;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (twilioAccountSid && twilioAuthToken) {
    twilioClient = twilio(twilioAccountSid, twilioAuthToken);
    console.log('✅ Twilio client initialized successfully');
  } else {
    console.warn('⚠️  Twilio credentials not set. WhatsApp notifications will not work.');
    console.warn('⚠️  Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in .env');
    twilioClient = null;
  }
  
  return twilioClient;
};

// WhatsApp message templates
export const whatsappTemplates = {
  budgetAlert: (data) => {
    const { userName, category, budgetLimit, spent, percentage, dashboardUrl } = data;
    const remaining = Math.max(0, budgetLimit - spent);
    
    return `💰 *Money Mind - Budget Alert*

Hi ${userName || 'there'}! 👋

⚠️ *Budget Warning*
You've used *${percentage.toFixed(1)}%* of your *${category}* budget.

📊 *Details:*
• Category: ${category}
• Budget Limit: ₹${budgetLimit.toLocaleString('en-IN')}
• Amount Spent: ₹${spent.toLocaleString('en-IN')}
• Remaining: ₹${remaining.toLocaleString('en-IN')}

You still have some room, but it's a good time to review your spending.

View Dashboard: ${dashboardUrl}/budget

---
Manage notifications: ${dashboardUrl}/settings`;
  },

  budgetExceeded: (data) => {
    const { userName, category, budgetLimit, spent, overAmount, dashboardUrl } = data;
    
    return `🚨 *Money Mind - Budget Exceeded*

Hi ${userName || 'there'}! 👋

⚠️ *URGENT: Budget Exceeded*
You've exceeded your *${category}* budget!

📊 *Details:*
• Category: ${category}
• Budget Limit: ₹${budgetLimit.toLocaleString('en-IN')}
• Amount Spent: ₹${spent.toLocaleString('en-IN')}
• Over Budget: ₹${overAmount.toLocaleString('en-IN')}

Please review your spending and adjust your budget if needed.

View Dashboard: ${dashboardUrl}/budget

---
Manage notifications: ${dashboardUrl}/settings`;
  },

  monthlyReport: (data) => {
    const { userName, month, year, totalIncome, totalExpenses, netSavings, savingsRate, topTransactions, categoryBreakdown } = data;
    
    const topTransactionsText = topTransactions.slice(0, 5).map(t => 
      `• ${t.description}: ${t.type === 'income' ? '+' : '-'}₹${Math.abs(t.amount).toLocaleString('en-IN')}`
    ).join('\n');

    const categoryText = categoryBreakdown.slice(0, 5).map(c => 
      `• ${c.name}: ₹${c.amount.toLocaleString('en-IN')} (${c.percentage.toFixed(1)}%)`
    ).join('\n');

    return `📊 *Money Mind - Monthly Report*

Hi ${userName || 'there'}! 👋

Here's your financial summary for *${month} ${year}*:

💰 *Summary:*
• Total Income: ₹${totalIncome.toLocaleString('en-IN')}
• Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
• Net Savings: ₹${netSavings.toLocaleString('en-IN')}
• Savings Rate: ${savingsRate.toFixed(1)}%

🏆 *Top Transactions:*
${topTransactionsText || 'No transactions this month'}

📊 *Category Breakdown:*
${categoryText || 'No expenses this month'}

Keep up the great work managing your finances! 💪

View Dashboard: ${data.dashboardUrl}/analytics

---
Manage notifications: ${data.dashboardUrl}/settings`;
  },
};

// Format phone number to E.164 format (required by Twilio)
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Add country code if not present (assuming India +91)
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  // Add + prefix
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return `whatsapp:${cleaned}`;
};

// Send WhatsApp message
export const sendWhatsApp = async (to, message) => {
  try {
    // Initialize Twilio client if not already initialized
    const client = initializeTwilio();
    if (!client) {
      console.error('❌ Twilio client not initialized. Cannot send WhatsApp message.');
      return { success: false, error: 'Twilio client not initialized' };
    }

    const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM;
    if (!twilioWhatsAppFrom) {
      console.error('❌ TWILIO_WHATSAPP_FROM not set. Cannot send WhatsApp message.');
      return { success: false, error: 'TWILIO_WHATSAPP_FROM not set' };
    }

    const formattedTo = formatPhoneNumber(to);
    if (!formattedTo) {
      console.error('❌ Invalid phone number:', to);
      return { success: false, error: 'Invalid phone number' };
    }

    const messageOptions = {
      from: twilioWhatsAppFrom,
      to: formattedTo,
      body: message,
    };

    const info = await client.messages.create(messageOptions);
    console.log('✅ WhatsApp message sent successfully:', info.sid);
    return { success: true, messageId: info.sid };
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
};

// Get user phone number from Supabase
export const getUserPhone = async (userId) => {
  try {
    if (!supabase) {
      console.warn('⚠️  Supabase client not initialized. Cannot fetch user phone numbers.');
      return null;
    }
    
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) throw error;
    
    // Try to get phone from user metadata or phone field
    const phone = data?.user?.phone || 
                 data?.user?.user_metadata?.phone || 
                 data?.user?.user_metadata?.phone_number ||
                 null;
    
    return phone;
  } catch (error) {
    console.error('Error fetching user phone:', error);
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

