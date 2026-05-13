import { getDb } from '../db/database.js';
import { generateFollowUpEmail } from './aiService.js';
import { sendEmail } from './emailService.js';
import { v4 as uuidv4 } from 'uuid';

export async function processFollowUps() {
    const db = getDb();
    const settings = {};
    db.prepare('SELECT * FROM settings').all().forEach(r => { settings[r.key] = r.value; });

    const followUpDays = [
        parseInt(settings.followup_1_days) || 3,
        parseInt(settings.followup_2_days) || 7,
        parseInt(settings.followup_3_days) || 14
    ];

    // Cevapsız e-postaları bul
    const sentEmails = db.prepare(`
        SELECT e.*, l.name as lead_name, l.email as lead_email, l.id as lid
        FROM emails e
        JOIN leads l ON e.lead_id = l.id
        WHERE e.status = 'sent'
        AND l.status = 'contacted'
        AND e.type = 'initial'
    `).all();

    let processed = 0;

    for (const email of sentEmails) {
        const sentDate = new Date(email.sent_at);
        const now = new Date();
        const daysSinceSent = Math.floor((now - sentDate) / (1000 * 60 * 60 * 24));

        // Kaç takip gönderilmiş
        const followUpCount = db.prepare(`
            SELECT COUNT(*) as count FROM emails WHERE lead_id = ? AND type LIKE 'followup%'
        `).get(email.lead_id).count;

        if (followUpCount >= 3) continue;

        const requiredDays = followUpDays[followUpCount];
        if (daysSinceSent < requiredDays) continue;

        // Son takip ne zaman gönderilmiş
        const lastFollowUp = db.prepare(`
            SELECT sent_at FROM emails WHERE lead_id = ? AND type LIKE 'followup%' ORDER BY sent_at DESC LIMIT 1
        `).get(email.lead_id);

        if (lastFollowUp) {
            const lastDate = new Date(lastFollowUp.sent_at);
            const daysSinceLastFollowUp = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
            if (daysSinceLastFollowUp < followUpDays[followUpCount] - followUpDays[followUpCount - 1]) continue;
        }

        try {
            console.log(`📨 Takip e-postası gönderiliyor: ${email.lead_name} (Takip #${followUpCount + 1})`);

            const content = await generateFollowUpEmail(
                { name: email.lead_name, company: email.lead_company, ...db.prepare('SELECT * FROM leads WHERE id = ?').get(email.lead_id) },
                email,
                followUpCount + 1
            );

            const id = uuidv4();
            db.prepare(`INSERT INTO emails (id, lead_id, campaign_id, subject, body, type, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)`)
                .run(id, email.lead_id, email.campaign_id, content.subject, content.body, `followup_${followUpCount + 1}`);

            await sendEmail({ to: email.lead_email, subject: content.subject, html: content.body });
            processed++;
        } catch (error) {
            console.error(`Takip e-postası gönderilemedi (${email.lead_name}):`, error.message);
        }
    }

    return { processed, total: sentEmails.length };
}
