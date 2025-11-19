/**
 * WhatsApp MFA API Routes
 */

import express from 'express';
import {
  enrollWhatsAppFactor,
  verifyWhatsAppEnrollment,
  challengeWhatsAppFactor,
  verifyWhatsAppChallenge,
  getWhatsAppMFAStatus,
  unenrollWhatsAppFactor
} from '../services/whatsappMfaService.js';

const router = express.Router();

router.post('/enroll-whatsapp', async (req, res) => {
  try {
    const { user_id, whatsapp_number } = req.body;

    console.log('📱 WhatsApp enrollment request:', { user_id, whatsapp_number });

    if (!user_id || !whatsapp_number) {
      console.error('❌ Missing required fields:', { user_id: !!user_id, whatsapp_number: !!whatsapp_number });
      return res.status(400).json({
        error: 'Missing required fields: user_id and whatsapp_number are required'
      });
    }

    const result = await enrollWhatsAppFactor(user_id, whatsapp_number);
    console.log('✅ WhatsApp enrollment successful:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Enroll WhatsApp error:', error);
    console.error('Error stack:', error.stack);
    res.status(400).json({
      error: error.message || 'Failed to enroll WhatsApp factor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/verify-whatsapp-enroll', async (req, res) => {
  try {
    const { user_id, code, challenge_id } = req.body;

    if (!user_id || !code || !challenge_id) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, code, and challenge_id are required'
      });
    }

    const result = await verifyWhatsAppEnrollment(user_id, code, challenge_id);
    res.json(result);
  } catch (error) {
    console.error('Verify WhatsApp enrollment error:', error);
    res.status(400).json({
      error: error.message || 'Failed to verify WhatsApp enrollment'
    });
  }
});

router.post('/challenge-whatsapp', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required field: user_id is required'
      });
    }

    const result = await challengeWhatsAppFactor(user_id);
    res.json(result);
  } catch (error) {
    console.error('Challenge WhatsApp error:', error);
    res.status(400).json({
      error: error.message || 'Failed to create WhatsApp challenge'
    });
  }
});

router.post('/verify-whatsapp-challenge', async (req, res) => {
  try {
    const { user_id, code, challenge_id } = req.body;

    if (!user_id || !code || !challenge_id) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, code, and challenge_id are required'
      });
    }

    const result = await verifyWhatsAppChallenge(user_id, code, challenge_id);
    res.json(result);
  } catch (error) {
    console.error('Verify WhatsApp challenge error:', error);
    res.status(400).json({
      error: error.message || 'Failed to verify WhatsApp challenge'
    });
  }
});

router.get('/whatsapp-mfa-status/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await getWhatsAppMFAStatus(user_id);
    res.json(result);
  } catch (error) {
    console.error('Get WhatsApp MFA status error:', error);
    res.status(400).json({
      error: error.message || 'Failed to get WhatsApp MFA status'
    });
  }
});

router.delete('/unenroll-whatsapp', async (req, res) => {
  try {
    const { user_id, factor_id } = req.body;

    if (!user_id || !factor_id) {
      return res.status(400).json({
        error: 'Missing required fields: user_id and factor_id are required'
      });
    }

    const result = await unenrollWhatsAppFactor(user_id, factor_id);
    res.json(result);
  } catch (error) {
    console.error('Unenroll WhatsApp error:', error);
    res.status(400).json({
      error: error.message || 'Failed to unenroll WhatsApp factor'
    });
  }
});

export default router;

