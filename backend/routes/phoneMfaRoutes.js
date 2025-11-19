/**
 * Phone MFA API Routes
 * 
 * These endpoints handle phone-based MFA enrollment and verification
 */

import express from 'express';
import {
  enrollPhoneFactor,
  verifyPhoneEnrollment,
  challengePhoneFactor,
  verifyPhoneChallenge,
  getPhoneMFAStatus,
  unenrollPhoneFactor
} from '../services/phoneMfaService.js';

const router = express.Router();

/**
 * POST /enroll-phone
 * Enrolls a phone number for MFA
 * 
 * Body: { user_id: string, phone: string }
 * Response: { success: boolean, enrollmentId: string, challengeId: string, expiresAt: string }
 */
router.post('/enroll-phone', async (req, res) => {
  try {
    const { user_id, phone } = req.body;

    if (!user_id || !phone) {
      return res.status(400).json({
        error: 'Missing required fields: user_id and phone are required'
      });
    }

    const result = await enrollPhoneFactor(user_id, phone);
    res.json(result);
  } catch (error) {
    console.error('Enroll phone error:', error);
    res.status(400).json({
      error: error.message || 'Failed to enroll phone factor'
    });
  }
});

/**
 * POST /verify-phone-enroll
 * Verifies the enrollment OTP code
 * 
 * Body: { user_id: string, code: string, challenge_id: string }
 * Response: { success: boolean, message: string, enrollmentData: object }
 */
router.post('/verify-phone-enroll', async (req, res) => {
  try {
    const { user_id, code, challenge_id } = req.body;

    if (!user_id || !code || !challenge_id) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, code, and challenge_id are required'
      });
    }

    const result = await verifyPhoneEnrollment(user_id, code, challenge_id);
    res.json(result);
  } catch (error) {
    console.error('Verify phone enrollment error:', error);
    res.status(400).json({
      error: error.message || 'Failed to verify phone enrollment'
    });
  }
});

/**
 * POST /challenge-phone
 * Requests a phone MFA challenge (sends OTP)
 * 
 * Body: { user_id: string }
 * Response: { success: boolean, challengeId: string, expiresAt: string }
 */
router.post('/challenge-phone', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required field: user_id is required'
      });
    }

    const result = await challengePhoneFactor(user_id);
    res.json(result);
  } catch (error) {
    console.error('Challenge phone error:', error);
    res.status(400).json({
      error: error.message || 'Failed to create phone challenge'
    });
  }
});

/**
 * POST /verify-phone-challenge
 * Verifies the challenge OTP code
 * 
 * Body: { user_id: string, code: string, challenge_id: string }
 * Response: { success: boolean, message: string, challengeId: string }
 */
router.post('/verify-phone-challenge', async (req, res) => {
  try {
    const { user_id, code, challenge_id } = req.body;

    if (!user_id || !code || !challenge_id) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, code, and challenge_id are required'
      });
    }

    const result = await verifyPhoneChallenge(user_id, code, challenge_id);
    res.json(result);
  } catch (error) {
    console.error('Verify phone challenge error:', error);
    res.status(400).json({
      error: error.message || 'Failed to verify phone challenge'
    });
  }
});

/**
 * GET /phone-mfa-status/:user_id
 * Get user's phone MFA status
 */
router.get('/phone-mfa-status/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await getPhoneMFAStatus(user_id);
    res.json(result);
  } catch (error) {
    console.error('Get phone MFA status error:', error);
    res.status(400).json({
      error: error.message || 'Failed to get phone MFA status'
    });
  }
});

/**
 * DELETE /unenroll-phone
 * Unenroll phone factor
 * 
 * Body: { user_id: string, factor_id: string }
 */
router.delete('/unenroll-phone', async (req, res) => {
  try {
    const { user_id, factor_id } = req.body;

    if (!user_id || !factor_id) {
      return res.status(400).json({
        error: 'Missing required fields: user_id and factor_id are required'
      });
    }

    const result = await unenrollPhoneFactor(user_id, factor_id);
    res.json(result);
  } catch (error) {
    console.error('Unenroll phone error:', error);
    res.status(400).json({
      error: error.message || 'Failed to unenroll phone factor'
    });
  }
});

export default router;

