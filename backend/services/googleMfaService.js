import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseServiceKey);

const supabaseAdmin = hasSupabaseConfig
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    : null;

/**
 * Generate a new TOTP secret and QR code for a user
 */
export async function generateSecret(userId, email) {
    if (!hasSupabaseConfig) {
        throw new Error('MFA disabled: missing Supabase configuration.');
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, 'MoneyMind', secret);

    try {
        const qrCode = await qrcode.toDataURL(otpauth);
        return { secret, qrCode };
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
}

/**
 * Verify a token and enable MFA for the user
 */
export async function verifyAndEnable(userId, token, secret) {
    if (!hasSupabaseConfig) {
        throw new Error('MFA disabled: missing Supabase configuration.');
    }

    try {
        const isValid = authenticator.verify({ token, secret });
        if (!isValid) {
            return { success: false, error: 'Invalid code' };
        }

        // Store secret in database
        const { error } = await supabaseAdmin
            .from('google_mfa_secrets')
            .upsert({
                user_id: userId,
                secret: secret,
                enabled: true,
                updated_at: new Date().toISOString()
            });

        if (error) {
            throw new Error(`Failed to save MFA secret: ${error.message}`);
        }

        return { success: true };
    } catch (error) {
        console.error('Error enabling MFA:', error);
        throw error;
    }
}

/**
 * Verify a token for login
 */
export async function verifyToken(userId, token) {
    if (!hasSupabaseConfig) {
        throw new Error('MFA disabled: missing Supabase configuration.');
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('google_mfa_secrets')
            .select('secret, enabled')
            .eq('user_id', userId)
            .single();

        if (error || !data || !data.enabled) {
            return { success: false, error: 'MFA not enabled for this user' };
        }

        const isValid = authenticator.verify({ token, secret: data.secret });
        return { success: isValid };
    } catch (error) {
        console.error('Error verifying token:', error);
        throw error;
    }
}

/**
 * Disable MFA for a user
 */
export async function disableMfa(userId) {
    if (!hasSupabaseConfig) {
        throw new Error('MFA disabled: missing Supabase configuration.');
    }

    try {
        const { error } = await supabaseAdmin
            .from('google_mfa_secrets')
            .delete()
            .eq('user_id', userId);

        if (error) {
            throw new Error(`Failed to disable MFA: ${error.message}`);
        }

        return { success: true };
    } catch (error) {
        console.error('Error disabling MFA:', error);
        throw error;
    }
}

/**
 * Get MFA status for a user
 */
export async function getMfaStatus(userId) {
    if (!hasSupabaseConfig) {
        return { enabled: false };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('google_mfa_secrets')
            .select('enabled')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.error('Error checking MFA status:', error);
        }

        return { enabled: !!data?.enabled };
    } catch (error) {
        console.error('Error checking MFA status:', error);
        return { enabled: false };
    }
}
