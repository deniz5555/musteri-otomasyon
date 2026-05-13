import { Router } from 'express';
import { getDb } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/campaigns - Tüm kampanyaları listele
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
        res.json({ campaigns });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/campaigns/:id - Kampanya detayı
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
        if (!campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });

        const leads = db.prepare(`
            SELECT l.*, cl.status as campaign_status
            FROM campaign_leads cl
            JOIN leads l ON cl.lead_id = l.id
            WHERE cl.campaign_id = ?
        `).all(req.params.id);

        const emails = db.prepare(`
            SELECT e.*, l.name as lead_name
            FROM emails e
            JOIN leads l ON e.lead_id = l.id
            WHERE e.campaign_id = ?
            ORDER BY e.created_at DESC
        `).all(req.params.id);

        res.json({ ...campaign, leads, emails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/campaigns - Yeni kampanya oluştur
router.post('/', (req, res) => {
    try {
        const db = getDb();
        const { name, sector, target_audience, email_template, email_subject, lead_ids } = req.body;

        if (!name) return res.status(400).json({ error: 'Kampanya adı zorunludur' });

        const id = uuidv4();
        db.prepare(`
            INSERT INTO campaigns (id, name, sector, target_audience, email_template, email_subject, total_leads)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, name, sector || null, target_audience || null,
              email_template || null, email_subject || null, lead_ids?.length || 0);

        // Lead'leri kampanyaya bağla
        if (lead_ids && lead_ids.length > 0) {
            const stmt = db.prepare('INSERT OR IGNORE INTO campaign_leads (campaign_id, lead_id) VALUES (?, ?)');
            for (const leadId of lead_ids) {
                stmt.run(id, leadId);
            }
        }

        const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/campaigns/:id - Kampanya güncelle
router.put('/:id', (req, res) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Kampanya bulunamadı' });

        const { name, sector, target_audience, email_template, email_subject, status } = req.body;

        db.prepare(`
            UPDATE campaigns SET
                name = COALESCE(?, name),
                sector = COALESCE(?, sector),
                target_audience = COALESCE(?, target_audience),
                email_template = COALESCE(?, email_template),
                email_subject = COALESCE(?, email_subject),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(name, sector, target_audience, email_template, email_subject, status, req.params.id);

        const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
        res.json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/campaigns/:id/leads - Kampanyaya lead ekle
router.post('/:id/leads', (req, res) => {
    try {
        const db = getDb();
        const { lead_ids } = req.body;

        const stmt = db.prepare('INSERT OR IGNORE INTO campaign_leads (campaign_id, lead_id) VALUES (?, ?)');
        for (const leadId of lead_ids) {
            stmt.run(req.params.id, leadId);
        }

        const count = db.prepare('SELECT COUNT(*) as count FROM campaign_leads WHERE campaign_id = ?').get(req.params.id).count;
        db.prepare('UPDATE campaigns SET total_leads = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(count, req.params.id);

        res.json({ message: `${lead_ids.length} lead kampanyaya eklendi` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/campaigns/:id - Kampanya sil
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM campaign_leads WHERE campaign_id = ?').run(req.params.id);
        db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
        res.json({ message: 'Kampanya silindi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/campaigns/:id/stats - Kampanya istatistikleri
router.get('/:id/stats', (req, res) => {
    try {
        const db = getDb();
        const totalLeads = db.prepare('SELECT COUNT(*) as count FROM campaign_leads WHERE campaign_id = ?').get(req.params.id).count;
        const sentEmails = db.prepare("SELECT COUNT(*) as count FROM emails WHERE campaign_id = ? AND status = 'sent'").get(req.params.id).count;
        const repliedEmails = db.prepare("SELECT COUNT(*) as count FROM emails WHERE campaign_id = ? AND status = 'replied'").get(req.params.id).count;

        res.json({
            totalLeads,
            sentEmails,
            repliedEmails,
            replyRate: sentEmails > 0 ? Math.round((repliedEmails / sentEmails) * 100) : 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
