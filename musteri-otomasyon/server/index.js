import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb, closeDb } from './db/database.js';
import leadsRouter from './routes/leads.js';
import campaignsRouter from './routes/campaigns.js';
import emailsRouter from './routes/emails.js';
import settingsRouter from './routes/settings.js';
import followupsRouter from './routes/followups.js';
import { startScheduler } from './cron/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize database
getDb();

// Routes
app.use('/api/leads', leadsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/follow-ups', followupsRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
    try {
        const db = getDb();
        const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
        const contactedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status IN ('contacted','replied','converted')").get().count;
        const totalEmails = db.prepare("SELECT COUNT(*) as count FROM emails WHERE status = 'sent'").get().count;
        const repliedEmails = db.prepare("SELECT COUNT(*) as count FROM emails WHERE status = 'replied'").get().count;
        const activeCampaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'").get().count;
        const convertedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'converted'").get().count;

        const recentActivity = db.prepare(`
            SELECT e.id, e.subject, e.status, e.type, e.sent_at, e.created_at,
                   l.name as lead_name, l.company as lead_company
            FROM emails e
            LEFT JOIN leads l ON e.lead_id = l.id
            ORDER BY e.created_at DESC
            LIMIT 10
        `).all();

        const replyRate = totalEmails > 0 ? Math.round((repliedEmails / totalEmails) * 100) : 0;

        res.json({
            totalLeads,
            contactedLeads,
            totalEmails,
            repliedEmails,
            replyRate,
            activeCampaigns,
            convertedLeads,
            recentActivity
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
    startScheduler();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Sunucu kapatılıyor...');
    closeDb();
    process.exit(0);
});
