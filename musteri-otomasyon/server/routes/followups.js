import { Router } from 'express';
import { processFollowUps } from '../services/followUpService.js';

const router = Router();

// POST /api/follow-ups/run
router.post('/run', async (req, res) => {
    try {
        const result = await processFollowUps();
        res.json({ message: 'Takip işlemi tamamlandı', ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
