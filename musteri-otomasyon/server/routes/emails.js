import { Router } from 'express';
import { getDb } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { generateEmail, generateFollowUpEmail } from '../services/aiService.js';
import { sendEmail } from '../services/emailService.js';

const router = Router();

// GET /api/emails
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const { lead_id, status, limit = 50, offset = 0 } = req.query;
        let query = `SELECT e.*, l.name as lead_name, l.company as lead_company, l.email as lead_email
            FROM emails e LEFT JOIN leads l ON e.lead_id = l.id WHERE 1=1`;
        const params = [];
        if (lead_id) { query += ' AND e.lead_id = ?'; params.push(lead_id); }
        if (status) { query += ' AND e.status = ?'; params.push(status); }
        query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));
        const emails = db.prepare(query).all(...params);
        res.json({ emails });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET /api/emails/:id - Tek e-posta detayı
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const email = db.prepare(`SELECT e.*, l.name as lead_name, l.company as lead_company, l.email as lead_email
            FROM emails e LEFT JOIN leads l ON e.lead_id = l.id WHERE e.id = ?`).get(req.params.id);
        if (!email) return res.status(404).json({ error: 'E-posta bulunamadı' });
        res.json(email);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/emails/generate - AI ile e-posta oluştur
router.post('/generate', async (req, res) => {
    try {
        const { lead_id, campaign_id, custom_instructions } = req.body;
        const db = getDb();
        const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead_id);
        if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
        let campaign = null;
        if (campaign_id) campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign_id);
        const emailContent = await generateEmail(lead, campaign, custom_instructions);
        const id = uuidv4();
        db.prepare(`INSERT INTO emails (id, lead_id, campaign_id, subject, body, type, status) VALUES (?, ?, ?, ?, ?, 'initial', 'draft')`)
            .run(id, lead_id, campaign_id || null, emailContent.subject, emailContent.body);
        const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
        res.json(email);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/emails/send
router.post('/send', async (req, res) => {
    try {
        const { email_id, lead_id, subject, body, campaign_id } = req.body;
        const db = getDb();
        let emailRecord;
        if (email_id) {
            emailRecord = db.prepare('SELECT * FROM emails WHERE id = ?').get(email_id);
            if (!emailRecord) return res.status(404).json({ error: 'E-posta bulunamadı' });
        } else {
            if (!lead_id || !subject || !body) return res.status(400).json({ error: 'lead_id, subject ve body zorunludur' });
            const id = uuidv4();
            db.prepare(`INSERT INTO emails (id, lead_id, campaign_id, subject, body, type, status) VALUES (?, ?, ?, ?, ?, 'initial', 'draft')`)
                .run(id, lead_id, campaign_id || null, subject, body);
            emailRecord = db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
        }
        const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(emailRecord.lead_id);
        if (!lead || !lead.email) return res.status(400).json({ error: 'Lead e-posta adresi bulunamadı' });
        await sendEmail({ to: lead.email, subject: emailRecord.subject, html: emailRecord.body });
        db.prepare(`UPDATE emails SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`).run(emailRecord.id);
        db.prepare(`UPDATE leads SET status = 'contacted', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('new', 'researched')`).run(lead.id);
        if (emailRecord.campaign_id) {
            db.prepare(`UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?`).run(emailRecord.campaign_id);
        }
        const updated = db.prepare('SELECT * FROM emails WHERE id = ?').get(emailRecord.id);
        res.json({ message: 'E-posta gönderildi', email: updated });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/emails/follow-up
router.post('/follow-up', async (req, res) => {
    try {
        const { lead_id, original_email_id } = req.body;
        const db = getDb();
        const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead_id);
        if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
        const originalEmail = db.prepare('SELECT * FROM emails WHERE id = ?').get(original_email_id);
        const followUpCount = db.prepare(`SELECT COUNT(*) as count FROM emails WHERE lead_id = ? AND type LIKE 'followup%'`).get(lead_id).count;
        if (followUpCount >= 3) return res.status(400).json({ error: 'Maksimum takip sayısına ulaşıldı' });
        const followUpContent = await generateFollowUpEmail(lead, originalEmail, followUpCount + 1);
        const id = uuidv4();
        db.prepare(`INSERT INTO emails (id, lead_id, campaign_id, subject, body, type, status) VALUES (?, ?, ?, ?, ?, ?, 'draft')`)
            .run(id, lead_id, originalEmail?.campaign_id || null, followUpContent.subject, followUpContent.body, `followup_${followUpCount + 1}`);
        const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
        res.json(email);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PUT /api/emails/:id
router.put('/:id', (req, res) => {
    try {
        const db = getDb();
        const { subject, body, status } = req.body;
        db.prepare(`UPDATE emails SET subject = COALESCE(?, subject), body = COALESCE(?, body), status = COALESCE(?, status) WHERE id = ?`)
            .run(subject, body, status, req.params.id);
        const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(req.params.id);
        res.json(email);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// DELETE /api/emails/:id
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM emails WHERE id = ?').run(req.params.id);
        res.json({ message: 'E-posta silindi' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/emails/batch-send - Kampanya leadlerine toplu e-posta gönder
router.post('/batch-send', async (req, res) => {
    try {
        const { campaign_id, email_template_type } = req.body;
        if (!campaign_id) return res.status(400).json({ error: 'campaign_id zorunludur' });

        const db = getDb();
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign_id);
        if (!campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });

        // Kampanyadaki leadleri al
        const campaignLeads = db.prepare(`
            SELECT l.* FROM campaign_leads cl
            JOIN leads l ON cl.lead_id = l.id
            WHERE cl.campaign_id = ?
        `).all(campaign_id);

        let sent = 0, failed = 0;
        const errors = [];

        for (const lead of campaignLeads) {
            try {
                if (!lead.email || !String(lead.email).trim()) {
                    throw new Error('Lead e-posta adresi yok');
                }
                const emailContent = await generateEmail(lead, campaign, null);
                await sendEmail({ to: lead.email, subject: emailContent.subject, html: emailContent.body });

                const id = uuidv4();
                db.prepare(`
                    INSERT INTO emails (id, lead_id, campaign_id, subject, body, type, status, sent_at) 
                    VALUES (?, ?, ?, ?, ?, 'initial', 'sent', CURRENT_TIMESTAMP)
                `).run(id, lead.id, campaign_id, emailContent.subject, emailContent.body);

                db.prepare(`UPDATE leads SET status = 'contacted', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                    .run(lead.id);

                db.prepare(`UPDATE campaign_leads SET status = 'sent' WHERE campaign_id = ? AND lead_id = ?`)
                    .run(campaign_id, lead.id);

                sent++;
            } catch (err) {
                failed++;
                errors.push(`${lead.name}: ${err.message}`);
                console.error(`Batch send error for ${lead.name}:`, err);
            }
        }

        // Kampanya stat'larını güncelle
        db.prepare(`UPDATE campaigns SET sent_count = sent_count + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(sent, campaign_id);

        res.json({ 
            message: `${sent} e-posta gönderildi, ${failed} hata oluştu`,
            sent, 
            failed, 
            errors: errors.slice(0, 5) // İlk 5 hatayı göster
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
