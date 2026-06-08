import { Router } from 'express';
import crypto from 'node:crypto';

const router = Router();

// Sabit zamanlı karşılaştırma: timing attack'a karşı
function safeCompare(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
        crypto.timingSafeEqual(bufA, bufA); // süreyi normalize et
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

router.post('/verify', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        return res.status(500).json({ error: 'Sunucu yapılandırma hatası' });
    }

    if (!password || !safeCompare(password, adminPassword)) {
        return res.status(401).json({ ok: false });
    }

    res.json({ ok: true });
});

export default router;
