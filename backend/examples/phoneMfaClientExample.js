/**
 * Client-Side Examples for Phone MFA
 * 
 * These examples show how to use the Phone MFA API from the frontend
 * using supabase-js and fetch API
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Example 1: Enroll Phone Number for MFA
 */
export async function enrollPhoneMFA(phoneNumber) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Call backend to enroll phone
    const response = await fetch(`${backendUrl}/api/phone-mfa/enroll-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        phone: phoneNumber // Must be in E.164 format: +1234567890
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to enroll phone');
    }

    console.log('✅ Enrollment OTP sent:', data);
    
    // Store challenge_id for verification
    return {
      enrollmentId: data.enrollmentId,
      challengeId: data.challengeId,
      expiresAt: data.expiresAt,
      phoneNumber: data.phoneNumber
    };
  } catch (error) {
    console.error('Error enrolling phone MFA:', error);
    throw error;
  }
}

/**
 * Example 2: Verify Phone Enrollment Code
 */
export async function verifyPhoneEnrollment(challengeId, code) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Verify the enrollment code
    const response = await fetch(`${backendUrl}/api/phone-mfa/verify-phone-enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        code: code,
        challenge_id: challengeId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify enrollment');
    }

    console.log('✅ Enrollment verified:', data);

    // Now complete enrollment in Supabase
    // Note: Supabase Phone MFA enrollment requires the phone number
    // You may need to use Supabase's built-in phone auth or handle this differently
    // depending on your Supabase configuration
    
    // Option 1: If using Supabase Phone Auth provider
    // const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
    //   factorType: 'phone',
    //   phone: data.enrollmentData.phoneNumber
    // });

    // Option 2: Store enrollment status in your profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        phone_mfa_enabled: true,
        phone_number: data.enrollmentData.phoneNumber
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    }

    return {
      success: true,
      phoneNumber: data.enrollmentData.phoneNumber
    };
  } catch (error) {
    console.error('Error verifying phone enrollment:', error);
    throw error;
  }
}

/**
 * Example 3: Request Phone MFA Challenge (for sign-in)
 */
export async function requestPhoneChallenge() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${backendUrl}/api/phone-mfa/challenge-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create challenge');
    }

    console.log('✅ Challenge OTP sent:', data);

    return {
      challengeId: data.challengeId,
      expiresAt: data.expiresAt
    };
  } catch (error) {
    console.error('Error requesting phone challenge:', error);
    throw error;
  }
}

/**
 * Example 4: Verify Phone Challenge Code (during sign-in)
 */
export async function verifyPhoneChallenge(challengeId, code) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // First verify with our backend
    const response = await fetch(`${backendUrl}/api/phone-mfa/verify-phone-challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        code: code,
        challenge_id: challengeId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify challenge');
    }

    console.log('✅ Challenge verified:', data);

    // Now verify with Supabase MFA
    // Get the factor ID first
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      throw new Error(`Failed to list factors: ${factorsError.message}`);
    }

    const phoneFactor = factors?.phone?.find(f => f.status === 'verified');
    if (!phoneFactor) {
      throw new Error('No verified phone factor found');
    }

    // Create Supabase challenge
    const { data: supabaseChallenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: phoneFactor.id
    });

    if (challengeError) {
      throw new Error(`Failed to create Supabase challenge: ${challengeError.message}`);
    }

    // Verify with Supabase (using the code we already verified)
    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
      factorId: phoneFactor.id,
      challengeId: supabaseChallenge.id,
      code: code
    });

    if (verifyError) {
      throw new Error(`Failed to verify with Supabase: ${verifyError.message}`);
    }

    console.log('✅ MFA verification complete:', verifyData);

    return {
      success: true,
      session: verifyData.session
    };
  } catch (error) {
    console.error('Error verifying phone challenge:', error);
    throw error;
  }
}

/**
 * Example 5: Get Phone MFA Status
 */
export async function getPhoneMFAStatus() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${backendUrl}/api/phone-mfa/phone-mfa-status/${user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get status');
    }

    return data;
  } catch (error) {
    console.error('Error getting phone MFA status:', error);
    throw error;
  }
}

/**
 * Example 6: Disable Phone MFA
 */
export async function disablePhoneMFA() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get factor ID
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      throw new Error(`Failed to list factors: ${factorsError.message}`);
    }

    const phoneFactor = factors?.phone?.find(f => f.status === 'verified');
    if (!phoneFactor) {
      throw new Error('No phone factor to disable');
    }

    // Unenroll via backend
    const response = await fetch(`${backendUrl}/api/phone-mfa/unenroll-phone`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        factor_id: phoneFactor.id
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to unenroll');
    }

    // Update profile
    await supabase
      .from('profiles')
      .update({ phone_mfa_enabled: false })
      .eq('id', user.id);

    return { success: true };
  } catch (error) {
    console.error('Error disabling phone MFA:', error);
    throw error;
  }
}

/**
 * Complete Example: Full Phone MFA Enrollment Flow
 */
export async function completePhoneMFAEnrollmentFlow(phoneNumber) {
  try {
    // Step 1: Enroll phone
    console.log('Step 1: Enrolling phone...');
    const enrollment = await enrollPhoneMFA(phoneNumber);
    
    // Step 2: Prompt user for code (in real app, show input modal)
    const code = prompt(`Enter the 6-digit code sent to ${phoneNumber}:`);
    
    if (!code) {
      throw new Error('Code is required');
    }

    // Step 3: Verify enrollment
    console.log('Step 2: Verifying enrollment code...');
    const verified = await verifyPhoneEnrollment(enrollment.challengeId, code);
    
    console.log('✅ Phone MFA enrollment complete!', verified);
    return verified;
  } catch (error) {
    console.error('Enrollment flow failed:', error);
    throw error;
  }
}

/**
 * Complete Example: Phone MFA Sign-In Flow
 */
export async function phoneMFASignInFlow(email, password) {
  try {
    // Step 1: Sign in with email/password
    console.log('Step 1: Signing in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      throw signInError;
    }

    // Step 2: Check if MFA is required
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
      // MFA required
      console.log('Step 2: MFA required, requesting challenge...');
      
      // Request challenge
      const challenge = await requestPhoneChallenge();
      
      // Step 3: Prompt user for code
      const code = prompt('Enter the 6-digit code sent to your phone:');
      
      if (!code) {
        throw new Error('Code is required');
      }

      // Step 4: Verify challenge
      console.log('Step 3: Verifying challenge code...');
      const verified = await verifyPhoneChallenge(challenge.challengeId, code);
      
      console.log('✅ Sign-in with MFA complete!', verified);
      return verified;
    } else {
      // No MFA required
      console.log('✅ Sign-in complete (no MFA required)');
      return { session: signInData.session };
    }
  } catch (error) {
    console.error('Sign-in flow failed:', error);
    throw error;
  }
}

