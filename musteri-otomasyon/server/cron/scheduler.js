import cron from 'node-cron';
import { processFollowUps } from '../services/followUpService.js';

export function startScheduler() {
    // Her saat başı takip e-postalarını kontrol et
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ Zamanlanmış takip kontrolü başlatılıyor...');
        try {
            const result = await processFollowUps();
            console.log(`✅ Takip kontrolü tamamlandı: ${result.processed}/${result.total} işlendi`);
        } catch (error) {
            console.error('❌ Takip kontrolü hatası:', error.message);
        }
    });

    console.log('⏰ Zamanlayıcı başlatıldı (her saat takip kontrolü)');
}
