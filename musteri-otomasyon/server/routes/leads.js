import { Router } from 'express';
import { getDb } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { researchLead } from '../services/leadResearch.js';

const router = Router();

// GET /api/leads - Tüm leadleri listele
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const { status, sector, search, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM leads WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (sector) {
            query += ' AND sector = ?';
            params.push(sector);
        }
        if (search) {
            query += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const leads = db.prepare(query).all(...params);
        const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;

        res.json({ leads, total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/leads/:id - Tek lead detayı
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

        // Lead'e gönderilen e-postaları da getir
        const emails = db.prepare('SELECT * FROM emails WHERE lead_id = ? ORDER BY created_at DESC').all(req.params.id);
        const conversations = db.prepare('SELECT * FROM conversations WHERE lead_id = ? ORDER BY created_at ASC').all(req.params.id);

        res.json({ ...lead, emails, conversations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/leads - Yeni lead ekle
router.post('/', (req, res) => {
    try {
        const db = getDb();
        const { name, company, position, sector, email, phone, linkedin, website, notes } = req.body;

        if (!name) return res.status(400).json({ error: 'İsim zorunludur' });

        const id = uuidv4();
        const stmt = db.prepare(`
            INSERT INTO leads (id, name, company, position, sector, email, phone, linkedin, website, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(id, name, company || null, position || null, sector || null,
                  email || null, phone || null, linkedin || null, website || null, notes || null);

        const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
        res.status(201).json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/leads/:id - Lead güncelle
router.put('/:id', (req, res) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Lead bulunamadı' });

        const { name, company, position, sector, email, phone, linkedin, website, notes, status, ai_summary } = req.body;

        const stmt = db.prepare(`
            UPDATE leads SET
                name = COALESCE(?, name),
                company = COALESCE(?, company),
                position = COALESCE(?, position),
                sector = COALESCE(?, sector),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                linkedin = COALESCE(?, linkedin),
                website = COALESCE(?, website),
                notes = COALESCE(?, notes),
                status = COALESCE(?, status),
                ai_summary = COALESCE(?, ai_summary),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(name, company, position, sector, email, phone, linkedin, website, notes, status, ai_summary, req.params.id);

        const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/leads/:id - Lead sil
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Lead bulunamadı' });

        db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
        res.json({ message: 'Lead silindi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/leads/research - AI ile lead araştır
router.post('/research', async (req, res) => {
    try {
        const { sector, targetRole, description } = req.body;
        if (!sector || !targetRole) {
            return res.status(400).json({ error: 'Sektör ve hedef rol zorunludur' });
        }
        const result = await researchLead(sector, targetRole, description);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/leads/bulk - Toplu lead ekle
router.post('/bulk', (req, res) => {
    try {
        const db = getDb();
        const { leads } = req.body;
        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ error: 'Lead listesi boş' });
        }

        const stmt = db.prepare(`
            INSERT INTO leads (id, name, company, position, sector, email, phone, linkedin, website, notes, ai_summary, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((leads) => {
            const results = [];
            for (const lead of leads) {
                const id = uuidv4();
                stmt.run(id, lead.name, lead.company || null, lead.position || null,
                    lead.sector || null, lead.email || null, lead.phone || null,
                    lead.linkedin || null, lead.website || null, lead.notes || null,
                    lead.ai_summary || null, lead.source || 'ai_research');
                results.push(id);
            }
            return results;
        });

        const ids = insertMany(leads);
        res.status(201).json({ message: `${ids.length} lead eklendi`, ids });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
