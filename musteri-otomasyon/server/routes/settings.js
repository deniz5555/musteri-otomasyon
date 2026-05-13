import { Router } from 'express';
import { getDb } from '../db/database.js';
import { testSmtpConnection } from '../services/emailService.js';

const router = Router();

function getAppSettings() {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    return {
        smtp_host: settings.smtp_host || process.env.SMTP_HOST || '',
        smtp_port: settings.smtp_port || process.env.SMTP_PORT || '587',
        smtp_user: settings.smtp_user || process.env.SMTP_USER || '',
        smtp_pass: settings.smtp_pass || process.env.SMTP_PASS || '',
        smtp_from_name: settings.smtp_from_name || process.env.SMTP_FROM_NAME || '',
        ai_provider: settings.ai_provider || process.env.AI_PROVIDER || 'openai',
        openai_api_key: settings.openai_api_key || process.env.OPENAI_API_KEY || '',
        gemini_api_key: settings.gemini_api_key || process.env.GEMINI_API_KEY || '',
        email_language: settings.email_language || 'tr',
        apify_api_key: settings.apify_api_key || process.env.APIFY_API_KEY || '',
        followup_1_days: settings.followup_1_days || process.env.FOLLOWUP_1_DAYS || '3',
        followup_2_days: settings.followup_2_days || process.env.FOLLOWUP_2_DAYS || '7',
        followup_3_days: settings.followup_3_days || process.env.FOLLOWUP_3_DAYS || '14',
        email_signature: settings.email_signature || '',
    };
}

// GET /api/settings
router.get('/', (req, res) => {
    try {
        res.json(getAppSettings());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/settings
router.put('/', (req, res) => {
    try {
        const db = getDb();
        const updates = req.body;
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
        const updateAll = db.transaction((entries) => {
            for (const [key, value] of Object.entries(entries)) {
                stmt.run(key, value);
            }
        });
        updateAll(updates);
        res.json({ message: 'Ayarlar güncellendi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/settings/:key
router.get('/:key', (req, res) => {
    try {
        const db = getDb();
        const row = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);
        if (!row) return res.status(404).json({ error: 'Ayar bulunamadı' });
        res.json(row);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/settings/test-smtp - SMTP bağlantısını test et
router.post('/test-smtp', async (req, res) => {
    try {
        const result = await testSmtpConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
