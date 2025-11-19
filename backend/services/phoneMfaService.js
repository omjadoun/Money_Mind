/**
 * Phone MFA Service for Supabase + Twilio Integration
 * 
 * This service handles:
 * - Phone number enrollment for MFA
 * - Sending OTP codes via Twilio SMS
 * - Verifying enrollment and challenge codes
 * 
 * Prerequisites:
 * 1. Configure Twilio in Supabase Dashboard:
 *    - Go to Authentication > Providers > Phone
 *    - Enable Phone provider
 *    - Add Twilio credentials (Account SID, Auth Token, Messaging Service SID)
 * 
 * 2. Set environment variables:
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 *    - TWILIO_ACCOUNT_SID
 *    - TWILIO_AUTH_TOKEN
 *    - TWILIO_MESSAGING_SERVICE_SID
 * 
 * 3. Database setup:
 *    - Run the migration SQL to create phone_mfa_enrollments table
 * 
 * Cost Notes:
 * - Twilio SMS pricing varies by country (typically $0.0075 - $0.05 per SMS)
 * - Consider rate limiting to prevent abuse
 * - Supabase Phone MFA may have additional costs
 * 
 * Rate Limiting:
 * - Implement rate limiting on challenge endpoints (max 3-5 attempts per 15 minutes)
 * - Consider daily limits per user (e.g., 10 challenges per day)
 */

import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseServiceKey);
if (!hasSupabaseConfig) {
  console.warn('⚠️  Phone MFA disabled: missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
}

if (!twilioAccountSid || !twilioAuthToken) {
  console.warn('⚠️  Twilio Account SID and Auth Token not set. Phone MFA will not work.');
} else if (!twilioMessagingServiceSid && !twilioPhoneNumber) {
  console.warn('⚠️  Twilio Messaging Service SID or Phone Number not set.');
  console.warn('   Set TWILIO_MESSAGING_SERVICE_SID (recommended) or TWILIO_PHONE_NUMBER (for testing)');
  console.warn('   See TWILIO_MESSAGING_SERVICE_SETUP.md for instructions');
}

const supabaseAdmin = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
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
 * Send OTP via Twilio SMS
 */
async function sendOTP(phoneNumber, code) {
  if (!hasSupabaseConfig) {
    throw new Error('Phone MFA disabled: missing Supabase configuration.');
  }
  if (!twilioClient) {
    throw new Error('Twilio client not initialized. Check your Twilio credentials.');
  }

  if (!twilioMessagingServiceSid && !twilioPhoneNumber) {
    throw new Error('Twilio Messaging Service SID or Phone Number not configured. Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER in .env');
  }

  try {
    const messageBody = `Your Money Mind verification code is: ${code}. This code expires in 10 minutes.`;
    
    // Use Messaging Service if available (preferred), otherwise use phone number directly
    const messageParams = {
      body: messageBody,
      to: phoneNumber
    };

    if (twilioMessagingServiceSid) {
      messageParams.messagingServiceSid = twilioMessagingServiceSid;
    } else {
      messageParams.from = twilioPhoneNumber;
    }

    const message = await twilioClient.messages.create(messageParams);

    console.log(`✅ OTP sent to ${phoneNumber} via Twilio. SID: ${message.sid}`);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error(`❌ Failed to send OTP via Twilio:`, error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
}

/**
 * Enroll a phone number for MFA
 * 
 * Note: Supabase Phone MFA enrollment requires the user to be authenticated.
 * For server-side enrollment, we need to:
 * 1. Create a temporary session for the user (using service role key)
 * 2. Enroll the phone factor
 * 3. Store enrollment details in our database
 */
export async function enrollPhoneFactor(userId, phoneNumber) {
  if (!hasSupabaseConfig) {
    throw new Error('Phone MFA disabled: missing Supabase configuration.');
  }
  try {
    // Validate phone number format (E.164 format: +1234567890)
    if (!phoneNumber.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +1234567890)');
    }

    // Get user to verify they exist
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error('User not found');
    }

    // Note: Supabase MFA factors are typically managed via user sessions
    // For server-side, we'll check our database for existing enrollments
    // The actual Supabase factor enrollment should be done client-side with user session
    
    // Check for existing verified enrollment in our database
    const { data: existingEnrollment } = await supabaseAdmin
      .from('phone_mfa_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .single();

    if (existingEnrollment) {
      throw new Error('User already has a verified phone factor. Disable it first to enroll a new one.');
    }

    // Generate OTP for enrollment verification
    const enrollmentCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store enrollment attempt in database
    const { data: enrollment, error: dbError } = await supabaseAdmin
      .from('phone_mfa_enrollments')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        enrollment_code: enrollmentCode,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to store enrollment: ${dbError.message}`);
    }

    // Send OTP via Twilio
    await sendOTP(phoneNumber, enrollmentCode);

    console.log(`📱 Enrollment OTP sent to ${phoneNumber} for user ${userId}`);

    return {
      success: true,
      enrollmentId: enrollment.id,
      challengeId: enrollment.id, // Using enrollment ID as challenge ID
      phoneNumber: phoneNumber,
      expiresAt: expiresAt.toISOString(),
      message: 'OTP sent to phone number'
    };
  } catch (error) {
    console.error('Error enrolling phone factor:', error);
    throw error;
  }
}

/**
 * Verify phone enrollment code and complete enrollment
 * 
 * This verifies the OTP code sent during enrollment and then
 * enrolls the phone factor in Supabase MFA system.
 */
export async function verifyPhoneEnrollment(userId, code, challengeId) {
  if (!hasSupabaseConfig) {
    throw new Error('Phone MFA disabled: missing Supabase configuration.');
  }
  try {
    // Get enrollment record
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('phone_mfa_enrollments')
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
        .from('phone_mfa_enrollments')
        .update({ failed_attempts: (enrollment.failed_attempts || 0) + 1 })
        .eq('id', challengeId);

      throw new Error('Invalid verification code');
    }

    // Code is valid - now enroll the phone factor in Supabase
    // Note: Supabase Phone MFA enrollment requires user session
    // We'll use the admin API to create a session and enroll
    
    // Get user's current session or create one
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData) {
      throw new Error('User not found');
    }

    // For server-side enrollment, we need to use the user's access token
    // In a real implementation, you might need to:
    // 1. Have the user authenticate first
    // 2. Use their session token to enroll
    // 3. Or use Supabase's admin API if available
    
    // Alternative: Store enrollment as verified and let client complete enrollment
    // The client will call supabase.auth.mfa.enroll() with the phone number
    
    // Update enrollment status
    await supabaseAdmin
      .from('phone_mfa_enrollments')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('id', challengeId);

    console.log(`✅ Phone enrollment verified for user ${userId}`);

    return {
      success: true,
      message: 'Phone enrollment verified. Complete enrollment on client side.',
      phoneNumber: enrollment.phone_number,
      // Return data needed for client-side enrollment
      enrollmentData: {
        phoneNumber: enrollment.phone_number,
        userId: userId
      }
    };
  } catch (error) {
    console.error('Error verifying phone enrollment:', error);
    throw error;
  }
}

/**
 * Request a phone MFA challenge (send OTP)
 * 
 * This creates a challenge for an already enrolled phone factor
 */
export async function challengePhoneFactor(userId) {
  if (!hasSupabaseConfig) {
    throw new Error('Phone MFA disabled: missing Supabase configuration.');
  }
  try {
    // Get user's verified phone enrollment from our database
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('phone_mfa_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('No verified phone factor found. Please enroll a phone number first.');
    }

    // Check rate limiting (max 5 challenges per 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const { data: recentChallenges, error: rateLimitError } = await supabaseAdmin
      .from('phone_mfa_challenges')
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
      .from('phone_mfa_challenges')
      .insert({
        user_id: userId,
        factor_id: 'phone', // Generic factor ID, actual Supabase factor ID managed client-side
        phone_number: enrollment.phone_number,
        challenge_code: challengeCode,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (challengeError) {
      throw new Error(`Failed to create challenge: ${challengeError.message}`);
    }

    // Send OTP via Twilio
    await sendOTP(enrollment.phone_number, challengeCode);

    console.log(`📱 Challenge OTP sent to ${enrollment.phone_number} for user ${userId}`);

    return {
      success: true,
      challengeId: challenge.id,
      expiresAt: expiresAt.toISOString(),
      message: 'OTP sent to registered phone number'
    };
  } catch (error) {
    console.error('Error creating phone challenge:', error);
    throw error;
  }
}

/**
 * Verify phone challenge code
 * 
 * This verifies the OTP code from a challenge and completes MFA verification
 */
export async function verifyPhoneChallenge(userId, code, challengeId) {
  if (!hasSupabaseConfig) {
    throw new Error('Phone MFA disabled: missing Supabase configuration.');
  }
  try {
    // Get challenge record
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('phone_mfa_challenges')
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
        .from('phone_mfa_challenges')
        .update({ status: 'expired' })
        .eq('id', challengeId);
      throw new Error('Challenge code has expired');
    }

    // Check failed attempts (max 5)
    if (challenge.failed_attempts >= 5) {
      await supabaseAdmin
        .from('phone_mfa_challenges')
        .update({ status: 'failed' })
        .eq('id', challengeId);
      throw new Error('Too many failed attempts. Please request a new code.');
    }

    // Verify code
    if (challenge.challenge_code !== code) {
      // Increment failed attempts
      await supabaseAdmin
        .from('phone_mfa_challenges')
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
      .from('phone_mfa_challenges')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('id', challengeId);

    console.log(`✅ Phone challenge verified for user ${userId}`);

    // Note: The actual MFA verification should be done on the client side
    // using supabase.auth.mfa.verify() with the challenge ID from Supabase
    // This service just validates the OTP code we sent

    return {
      success: true,
      message: 'Phone challenge verified successfully',
      challengeId: challengeId,
      // Client should now call supabase.auth.mfa.verify() with this challengeId
    };
  } catch (error) {
    console.error('Error verifying phone challenge:', error);
    throw error;
  }
}

/**
 * Get user's phone MFA status
 */
export async function getPhoneMFAStatus(userId) {
  if (!hasSupabaseConfig) {
    return {
      hasPhoneMFA: false,
      phoneNumber: null,
      factorId: null,
      status: null
    };
  }
  try {
    // Get enrollment status from our database
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('phone_mfa_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .single();
    
    return {
      hasPhoneMFA: !!enrollment,
      phoneNumber: enrollment?.phone_number || null,
      factorId: enrollment?.id || null,
      status: enrollment?.status || null,
      verifiedAt: enrollment?.verified_at || null
    };
  } catch (error) {
    // If no enrollment found, return false
    if (error.code === 'PGRST116') {
      return {
        hasPhoneMFA: false,
        phoneNumber: null,
        factorId: null,
        status: null
      };
    }
    console.error('Error getting phone MFA status:', error);
    throw error;
  }
}

/**
 * Unenroll phone factor
 */
export async function unenrollPhoneFactor(userId, factorId) {
  if (!hasSupabaseConfig) {
    throw new Error('Phone MFA disabled: missing Supabase configuration.');
  }
  try {
    // Mark all related enrollments and challenges as inactive
    const { error: updateError } = await supabaseAdmin
      .from('phone_mfa_enrollments')
      .update({ status: 'unenrolled' })
      .eq('user_id', userId)
      .eq('status', 'verified');

    if (updateError) {
      throw new Error(`Failed to update enrollment: ${updateError.message}`);
    }

    // Note: Actual Supabase MFA unenrollment should be done client-side
    // with the user's session using supabase.auth.mfa.unenroll()

    console.log(`✅ Phone factor unenrolled for user ${userId}`);

    return {
      success: true,
      message: 'Phone MFA disabled successfully'
    };
  } catch (error) {
    console.error('Error unenrolling phone factor:', error);
    throw error;
  }
}

