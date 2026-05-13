import { ApifyClient } from 'apify-client';
import { getDb } from '../db/database.js';

function getApifyKey() {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'apify_api_key'").get();
    return row?.value || process.env.APIFY_API_KEY || '';
}

/**
 * Google Maps üzerinden işletme/kişi araştırması yapar
 * @param {string} sector - Sektör (ör: "diş kliniği", "avukat")
 * @param {string} targetRole - Hedef rol (ör: "sahibi", "müdür")
 * @param {string} description - Ek açıklama / lokasyon (ör: "İstanbul Kadıköy")
 */
export async function researchLead(sector, targetRole, description) {
    const apiKey = getApifyKey();
    if (!apiKey) {
        throw new Error('Apify API anahtarı ayarlanmamış. Ayarlar sayfasından girin.');
    }

    const client = new ApifyClient({ token: apiKey });

    // Arama sorgusu oluştur
    const searchQuery = `${sector} ${description || ''}`.trim();

    console.log(`🔍 Apify ile aranıyor: "${searchQuery}"`);

    try {
        // Google Maps Scraper aktörünü çalıştır
        const run = await client.actor('compass/crawler-google-places').call({
            searchStringsArray: [searchQuery],
            maxCrawledPlacesPerSearch: 10,
            language: 'tr',
            deeperCityScrape: false,
            scrapeContacts: true,
            scrapeEmails: true,
        }, {
            waitSecs: 120
        });

        // Sonuçları al
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`✅ ${items.length} sonuç bulundu`);

        // Sonuçları lead formatına dönüştür
        const leads = items.map(item => ({
            name: item.contactName || item.title || '',
            company: item.title || item.name || '',
            position: targetRole || '',
            sector: sector,
            email: extractEmail(item),
            phone: item.phone || item.phoneUnformatted || '',
            website: item.website || item.url || '',
            linkedin: '',
            notes: buildNotes(item),
            ai_summary: buildSummary(item),
            source: 'apify_google_maps'
        })).filter(lead => lead.company);

        return { leads, rawCount: items.length };
    } catch (error) {
        console.error('Apify hatası:', error.message);
        throw new Error(`Apify araması başarısız: ${error.message}`);
    }
}

/**
 * Apify ile web sitesinden e-posta ve iletişim bilgisi çeker
 */
export async function scrapeWebsite(websiteUrl) {
    const apiKey = getApifyKey();
    if (!apiKey) throw new Error('Apify API anahtarı ayarlanmamış.');

    const client = new ApifyClient({ token: apiKey });

    try {
        const run = await client.actor('apify/contact-info-scraper').call({
            startUrls: [{ url: websiteUrl }],
            maxRequestsPerStartUrl: 5,
        }, { waitSecs: 60 });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        const emails = [];
        const phones = [];
        items.forEach(item => {
            if (item.emails) emails.push(...item.emails);
            if (item.phones) phones.push(...item.phones);
        });

        return {
            emails: [...new Set(emails)],
            phones: [...new Set(phones)],
            raw: items
        };
    } catch (error) {
        console.error('Website scrape hatası:', error.message);
        throw error;
    }
}

function extractEmail(item) {
    if (item.email) return item.email;
    if (item.emails && item.emails.length > 0) return item.emails[0];
    if (item.contactEmail) return item.contactEmail;
    return '';
}

function buildNotes(item) {
    const parts = [];
    if (item.address) parts.push(`📍 ${item.address}`);
    if (item.totalScore) parts.push(`⭐ ${item.totalScore}/5 (${item.reviewsCount || 0} yorum)`);
    if (item.categoryName) parts.push(`📂 ${item.categoryName}`);
    if (item.openingHours) {
        const hours = Array.isArray(item.openingHours) 
            ? item.openingHours.slice(0, 2).join(', ') 
            : '';
        if (hours) parts.push(`🕐 ${hours}`);
    }
    return parts.join('\n');
}

function buildSummary(item) {
    const parts = [];
    parts.push(`${item.title || item.name || 'İsimsiz İşletme'}`);
    if (item.categoryName) parts.push(`Kategori: ${item.categoryName}`);
    if (item.address) parts.push(`Adres: ${item.address}`);
    if (item.totalScore) parts.push(`Puan: ${item.totalScore}/5 (${item.reviewsCount || 0} değerlendirme)`);
    if (item.website) parts.push(`Web: ${item.website}`);
    return parts.join(' | ');
}
