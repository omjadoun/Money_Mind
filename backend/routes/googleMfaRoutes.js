import express from 'express';
import {
    generateSecret,
    verifyAndEnable,
    verifyToken,
    disableMfa,
    getMfaStatus
} from '../services/googleMfaService.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
    try {
        const { userId, email } = req.body;
        if (!userId || !email) {
            return res.status(400).json({ error: 'User ID and email are required' });
        }
        const result = await generateSecret(userId, email);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/verify-setup', async (req, res) => {
    try {
        const { userId, token, secret } = req.body;
        if (!userId || !token || !secret) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const result = await verifyAndEnable(userId, token, secret);
        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { userId, token } = req.body;
        if (!userId || !token) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const result = await verifyToken(userId, token);
        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Invalid code' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/disable', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        await disableMfa(userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await getMfaStatus(userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
