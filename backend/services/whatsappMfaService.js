/**
 * WhatsApp MFA Service for Supabase + Twilio Integration
 * 
 * This service handles WhatsApp-based MFA enrollment and verification
 * Similar to Phone MFA but uses WhatsApp messaging instead of SMS
 */

import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM;

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseServiceKey);
if (!hasSupabaseConfig) {
  console.warn('⚠️  WhatsApp MFA disabled: missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
}

if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppFrom) {
  console.warn('⚠️  Twilio WhatsApp credentials not set. WhatsApp MFA will not work.');
}

const supabaseAdmin = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

const twilioClient = twilioAccountSid && twilioAuthToken 
  ? twilio(twilioAccountSid, twilioAuthToken)
  : null;

/**
 * Generate a 6-digit OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via Twilio WhatsApp
 */
async function sendWhatsAppOTP(whatsappNumber, code) {
  if (!hasSupabaseConfig) {
    throw new Error('WhatsApp MFA disabled: missing Supabase configuration.');
  }
  if (!twilioClient) {
    throw new Error('Twilio client not initialized. Check your Twilio credentials.');
  }

  if (!twilioWhatsAppFrom) {
    throw new Error('TWILIO_WHATSAPP_FROM not configured. Set it in .env file.');
  }

  try {
    // Ensure WhatsApp number format (whatsapp:+1234567890)
    const formattedNumber = whatsappNumber.startsWith('whatsapp:') 
      ? whatsappNumber 
      : `whatsapp:${whatsappNumber}`;

    console.log(`📤 Attempting to send WhatsApp to: ${formattedNumber}`);
    console.log(`📤 From: ${twilioWhatsAppFrom}`);

    const message = await twilioClient.messages.create({
      body: `🔐 Your Money Mind verification code is: *${code}*\n\nThis code expires in 10 minutes.\n\nDo not share this code with anyone.`,
      from: twilioWhatsAppFrom,
      to: formattedNumber
    });

    console.log(`✅ WhatsApp OTP sent successfully!`);
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   To: ${message.to}`);
    
    return { success: true, messageSid: message.sid, status: message.status };
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp OTP via Twilio:`);
    console.error(`   Error Code: ${error.code}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Error Status: ${error.status}`);
    
    // Provide helpful error messages
    let userFriendlyError = error.message;
    
    if (error.code === 21211) {
      userFriendlyError = 'Invalid phone number format. Please use international format: +1234567890';
    } else if (error.code === 21608) {
      userFriendlyError = 'WhatsApp Sandbox: You need to join the Twilio Sandbox first. Send "join <sandbox-code>" to +1 415 523 8886';
    } else if (error.code === 21610) {
      userFriendlyError = 'Recipient has not opted in. For sandbox, send "join <sandbox-code>" to +1 415 523 8886';
    } else if (error.code === 63007) {
      userFriendlyError = 'WhatsApp Business Account not approved. Check Twilio Console for approval status.';
    } else if (error.code === 20003) {
      userFriendlyError = 'Twilio authentication failed. Check your Account SID and Auth Token.';
    } else if (error.code === 20429) {
      userFriendlyError = 'Too many requests. Please wait a moment and try again.';
    }
    
    throw new Error(`Failed to send WhatsApp message: ${userFriendlyError}`);
  }
}

/**
 * Enroll a WhatsApp number for MFA
 */
export async function enrollWhatsAppFactor(userId, whatsappNumber) {
  if (!hasSupabaseConfig) {
    throw new Error('WhatsApp MFA disabled: missing Supabase configuration.');
  }
  try {
    // Validate WhatsApp number format
    const formattedNumber = whatsappNumber.startsWith('whatsapp:') 
      ? whatsappNumber 
      : whatsappNumber.startsWith('+')
      ? `whatsapp:${whatsappNumber}`
      : `whatsapp:+${whatsappNumber}`;

    // Get user to verify they exist
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error('User not found');
    }

    // Check for existing verified WhatsApp enrollment
    const { data: existingEnrollment, error: checkError } = await supabaseAdmin
      .from('whatsapp_mfa_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('Error checking existing enrollment:', checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    if (existingEnrollment) {
      throw new Error('User already has a verified WhatsApp factor. Disable it first to enroll a new one.');
    }

    // Generate OTP for enrollment verification
    const enrollmentCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store enrollment attempt in database
    console.log('📝 Storing enrollment in database...');
    const { data: enrollment, error: dbError } = await supabaseAdmin
      .from('whatsapp_mfa_enrollments')
      .insert({
        user_id: userId,
        whatsapp_number: formattedNumber,
        enrollment_code: enrollmentCode,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database insert error:', dbError);
      console.error('Error code:', dbError.code);
      console.error('Error details:', dbError.details);
      console.error('Error hint:', dbError.hint);
      throw new Error(`Failed to store enrollment: ${dbError.message || dbError.code || 'Unknown database error'}`);
    }

    console.log('✅ Enrollment stored successfully:', enrollment.id);

    // Send OTP via WhatsApp
    console.log('📤 Sending WhatsApp OTP...');
    try {
      await sendWhatsAppOTP(formattedNumber, enrollmentCode);
      console.log('✅ WhatsApp OTP sent successfully');
    } catch (whatsappError) {
      // If WhatsApp send fails, still return the enrollment but log the error
      console.error('⚠️ WhatsApp send failed, but enrollment created:', whatsappError);
      // You might want to delete the enrollment if WhatsApp fails, or keep it for retry
      // For now, we'll keep it and let the user know
      throw new Error(`Enrollment created but failed to send WhatsApp: ${whatsappError.message}`);
    }

    console.log(`📱 WhatsApp enrollment OTP sent to ${formattedNumber} for user ${userId}`);

    return {
      success: true,
      enrollmentId: enrollment.id,
      challengeId: enrollment.id,
      whatsappNumber: formattedNumber,
      expiresAt: expiresAt.toISOString(),
      message: 'OTP sent to WhatsApp number'
    };
  } catch (error) {
    console.error('Error enrolling WhatsApp factor:', error);
    throw error;
  }
}

/**
 * Verify WhatsApp enrollment code and complete enrollment
 */
export async function verifyWhatsAppEnrollment(userId, code, challengeId) {
  if (!hasSupabaseConfig) {
    throw new Error('WhatsApp MFA disabled: missing Supabase configuration.');
  }
  try {
    // Get enrollment record
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('whatsapp_mfa_enrollments')
      .select('*')
      .eq('id', challengeId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('Invalid or expired enrollment challenge');
    }

    // Check if code is expired
    if (new Date(enrollment.expires_at) < new Date()) {
      throw new Error('Enrollment code has expired');
    }

    // Verify code
    if (enrollment.enrollment_code !== code) {
      // Increment failed attempts
      await supabaseAdmin
        .from('whatsapp_mfa_enrollments')
        .update({ failed_attempts: (enrollment.failed_attempts || 0) + 1 })
        .eq('id', challengeId);

      throw new Error('Invalid verification code');
    }

    // Code is valid - update enrollment status
    await supabaseAdmin
      .from('whatsapp_mfa_enrollments')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('id', challengeId);

    console.log(`✅ WhatsApp enrollment verified for user ${userId}`);

    return {
      success: true,
      message: 'WhatsApp enrollment verified successfully',
      whatsappNumber: enrollment.whatsapp_number,
      enrollmentData: {
        whatsappNumber: enrollment.whatsapp_number,
        userId: userId
      }
    };
  } catch (error) {
    console.error('Error verifying WhatsApp enrollment:', error);
    throw error;
  }
}

/**
 * Request a WhatsApp MFA challenge (send OTP)
 */
export async function challengeWhatsAppFactor(userId) {
  if (!hasSupabaseConfig) {
    throw new Error('WhatsApp MFA disabled: missing Supabase configuration.');
  }
  try {
    // Get user's verified WhatsApp enrollment
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('whatsapp_mfa_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('No verified WhatsApp factor found. Please enroll a WhatsApp number first.');
    }

    // Check rate limiting (max 5 challenges per 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const { data: recentChallenges } = await supabaseAdmin
      .from('whatsapp_mfa_challenges')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('created_at', fifteenMinutesAgo.toISOString());

    if (recentChallenges && recentChallenges.length >= 5) {
      throw new Error('Too many challenge requests. Please wait before requesting another code.');
    }

    // Generate OTP
    const challengeCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store challenge in database
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('whatsapp_mfa_challenges')
      .insert({
        user_id: userId,
        factor_id: 'whatsapp',
        whatsapp_number: enrollment.whatsapp_number,
        challenge_code: challengeCode,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (challengeError) {
      throw new Error(`Failed to create challenge: ${challengeError.message}`);
    }

    // Send OTP via WhatsApp
    await sendWhatsAppOTP(enrollment.whatsapp_number, challengeCode);

    console.log(`📱 WhatsApp challenge OTP sent to ${enrollment.whatsapp_number} for user ${userId}`);

    return {
      success: true,
      challengeId: challenge.id,
      expiresAt: expiresAt.toISOString(),
      message: 'OTP sent to registered WhatsApp number'
    };
  } catch (error) {
    console.error('Error creating WhatsApp challenge:', error);
    throw error;
  }
}

/**
 * Verify WhatsApp challenge code
 */
export async function verifyWhatsAppChallenge(userId, code, challengeId) {
  if (!hasSupabaseConfig) {
    throw new Error('WhatsApp MFA disabled: missing Supabase configuration.');
  }
  try {
    // Get challenge record
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('whatsapp_mfa_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (challengeError || !challenge) {
      throw new Error('Invalid or expired challenge');
    }

    // Check if challenge is expired
    if (new Date(challenge.expires_at) < new Date()) {
      await supabaseAdmin
        .from('whatsapp_mfa_challenges')
        .update({ status: 'expired' })
        .eq('id', challengeId);
      throw new Error('Challenge code has expired');
    }

    // Check failed attempts (max 5)
    if (challenge.failed_attempts >= 5) {
      await supabaseAdmin
        .from('whatsapp_mfa_challenges')
        .update({ status: 'failed' })
        .eq('id', challengeId);
      throw new Error('Too many failed attempts. Please request a new code.');
    }

    // Verify code
    if (challenge.challenge_code !== code) {
      // Increment failed attempts
      await supabaseAdmin
        .from('whatsapp_mfa_challenges')
        .update({ 
          failed_attempts: (challenge.failed_attempts || 0) + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', challengeId);

      const remainingAttempts = 5 - (challenge.failed_attempts || 0) - 1;
      throw new Error(`Invalid code. ${remainingAttempts} attempts remaining.`);
    }

    // Code is valid - mark challenge as verified
    await supabaseAdmin
      .from('whatsapp_mfa_challenges')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('id', challengeId);

    console.log(`✅ WhatsApp challenge verified for user ${userId}`);

    return {
      success: true,
      message: 'WhatsApp challenge verified successfully',
      challengeId: challengeId,
    };
  } catch (error) {
    console.error('Error verifying WhatsApp challenge:', error);
    throw error;
  }
}

/**
 * Get user's WhatsApp MFA status
 */
export async function getWhatsAppMFAStatus(userId) {
  if (!hasSupabaseConfig) {
    return {
      hasWhatsAppMFA: false,
      whatsappNumber: null,
      factorId: null,
      status: null
    };
  }
  try {
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('whatsapp_mfa_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .single();
    
    if (enrollmentError && enrollmentError.code === 'PGRST116') {
      return {
        hasWhatsAppMFA: false,
        whatsappNumber: null,
        factorId: null,
        status: null
      };
    }
    
    return {
      hasWhatsAppMFA: !!enrollment,
      whatsappNumber: enrollment?.whatsapp_number || null,
      factorId: enrollment?.id || null,
      status: enrollment?.status || null,
      verifiedAt: enrollment?.verified_at || null
    };
  } catch (error) {
    console.error('Error getting WhatsApp MFA status:', error);
    throw error;
  }
}

/**
 * Unenroll WhatsApp factor
 */
export async function unenrollWhatsAppFactor(userId, factorId) {
  if (!hasSupabaseConfig) {
    throw new Error('WhatsApp MFA disabled: missing Supabase configuration.');
  }
  try {
    // Mark all related enrollments and challenges as inactive
    const { error: updateError } = await supabaseAdmin
      .from('whatsapp_mfa_enrollments')
      .update({ status: 'unenrolled' })
      .eq('user_id', userId)
      .eq('status', 'verified');

    if (updateError) {
      throw new Error(`Failed to update enrollment: ${updateError.message}`);
    }

    console.log(`✅ WhatsApp factor unenrolled for user ${userId}`);

    return {
      success: true,
      message: 'WhatsApp MFA disabled successfully'
    };
  } catch (error) {
    console.error('Error unenrolling WhatsApp factor:', error);
    throw error;
  }
}

