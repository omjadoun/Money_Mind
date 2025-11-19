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

// Email templates (only for 2FA - budget and monthly reports removed)
export const emailTemplates = {
  twoFactorAuth: (data) => {
    const { code, userName } = data;
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
    .code-box { background: white; border: 2px dashed #667eea; padding: 30px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; font-size: 14px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Money Mind</h1>
      <p>Two-Factor Authentication</p>
    </div>
    <div class="content">
      <h2>Hi ${userName || 'there'}! 👋</h2>
      <p>You're setting up two-factor authentication for your Money Mind account. Use the code below to verify:</p>
      
      <div class="code-box">
        <p style="margin: 0 0 10px 0; color: #666;">Your verification code:</p>
        <div class="code">${code}</div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Security Notice</strong><br>
        This code will expire in 10 minutes. If you didn't request this code, please ignore this email or contact support.
      </div>
      
      <p>Enter this code in the Money Mind app to complete your 2FA setup.</p>
      
      <div class="footer">
        <p>This is an automated message from Money Mind.</p>
        <p>Do not share this code with anyone.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  },

  twoFactorAuthSignIn: (data) => {
    const { code, userName } = data;
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
    .code-box { background: white; border: 2px dashed #667eea; padding: 30px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; font-size: 14px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Money Mind</h1>
      <p>Sign-In Verification</p>
    </div>
    <div class="content">
      <h2>Hi ${userName || 'there'}! 👋</h2>
      <p>Someone is trying to sign in to your Money Mind account. Use the code below to verify:</p>
      
      <div class="code-box">
        <p style="margin: 0 0 10px 0; color: #666;">Your verification code:</p>
        <div class="code">${code}</div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Security Notice</strong><br>
        This code will expire in 10 minutes. If you didn't try to sign in, please secure your account immediately.
      </div>
      
      <p>Enter this code in the Money Mind app to complete sign-in.</p>
      
      <div class="footer">
        <p>This is an automated message from Money Mind.</p>
        <p>Do not share this code with anyone.</p>
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
    // Check if email is configured
    if (!process.env.EMAIL_USER && !process.env.EMAIL_SERVICE && !process.env.EMAIL_HOST) {
      console.warn('⚠️  Email not configured. EMAIL_USER, EMAIL_SERVICE, or EMAIL_HOST not set.');
      return { 
        success: false, 
        error: 'Email service not configured. Please set EMAIL_SERVICE and EMAIL_USER in backend/.env file.' 
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Money Mind <noreply@moneymind.com>',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to', to, 'Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email to', to, ':', error.message);
    console.error('Full error:', error);
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


