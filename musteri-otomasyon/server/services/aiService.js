import OpenAI from 'openai';
import { getDb } from '../db/database.js';

function getSettings() {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM settings').all();
    const s = {};
    rows.forEach(r => { s[r.key] = r.value; });
    return s;
}

async function callAI(prompt, systemPrompt) {
    const settings = getSettings();
    const provider = settings.ai_provider || 'openai';

    if (provider === 'openai') {
        const client = new OpenAI({ apiKey: settings.openai_api_key || process.env.OPENAI_API_KEY });
        const response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });
        return response.choices[0].message.content;
    } else if (provider === 'gemini') {
        const apiKey = settings.gemini_api_key || process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
            })
        });
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    throw new Error('AI sağlayıcı yapılandırılmamış');
}

export async function generateEmail(lead, campaign, customInstructions) {
    const settings = getSettings();
    const lang = settings.email_language === 'en' ? 'English' : 'Turkish';
    const signature = settings.email_signature || '';

    const systemPrompt = `Sen profesyonel bir iş geliştirme uzmanısın. Yapay zeka otomasyon çözümleri satan bir şirket için potansiyel müşterilere kişiselleştirilmiş, ikna edici e-postalar yazıyorsun. E-posta ${lang} dilinde olmalı.

Kurallar:
- Kısa ve öz ol (max 200 kelime)
- Kişinin sektörüne ve pozisyonuna özel değer önerileri sun
- Spam gibi görünme, doğal ve profesyonel ol
- Yapay zeka otomasyonlarının o kişinin işine nasıl fayda sağlayacağını somut örneklerle açıkla
- Bir aksiyon çağrısı (CTA) ekle
- JSON formatında cevap ver: {"subject": "...", "body": "..."}
${signature ? `- İmza olarak şunu ekle: ${signature}` : ''}`;

    const prompt = `Aşağıdaki kişiye e-posta yaz:
İsim: ${lead.name}
Şirket: ${lead.company || 'Bilinmiyor'}
Pozisyon: ${lead.position || 'Bilinmiyor'}
Sektör: ${lead.sector || campaign?.sector || 'Bilinmiyor'}
Web Sitesi: ${lead.website || 'Bilinmiyor'}
Notlar: ${lead.notes || 'Yok'}
AI Özet: ${lead.ai_summary || 'Yok'}
${campaign ? `Kampanya: ${campaign.name}\nHedef Kitle: ${campaign.target_audience || ''}` : ''}
${customInstructions ? `Ek Talimatlar: ${customInstructions}` : ''}`;

    const response = await callAI(prompt, systemPrompt);
    try {
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return { subject: parsed.subject || 'İşbirliği Teklifi', body: parsed.body || response };
    } catch (err) {
        console.warn('JSON parse hatası, raw response dönülüyor:', err.message);
        return { subject: `${lead.company || lead.name} için AI Otomasyon Çözümleri`, body: response };
    }
}

export async function generateFollowUpEmail(lead, originalEmail, followUpNumber) {
    const settings = getSettings();
    const lang = settings.email_language === 'en' ? 'English' : 'Turkish';

    const systemPrompt = `Sen profesyonel bir iş geliştirme uzmanısın. Daha önce gönderdiğin e-postaya cevap gelmedi, şimdi ${followUpNumber}. takip e-postasını yazıyorsun. ${lang} dilinde yaz.

Kurallar:
- Önceki e-postaya referans ver ama tekrarlama
- Takip numarasına göre tonu ayarla (1. kibar hatırlatma, 2. ek değer sun, 3. son şans)
- Kısa tut (max 100 kelime)
- JSON formatında cevap ver: {"subject": "...", "body": "..."}`;

    const prompt = `Takip e-postası yaz:
Kişi: ${lead.name} (${lead.company || ''})
Önceki e-posta konusu: ${originalEmail?.subject || 'Bilinmiyor'}
Takip #: ${followUpNumber}`;

    const response = await callAI(prompt, systemPrompt);
    try {
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return { subject: parsed.subject || 'Takip E-postası', body: parsed.body || response };
    } catch (err) {
        console.warn('JSON parse hatası, raw response dönülüyor:', err.message);
        return { subject: `Re: ${originalEmail?.subject || 'Takip'}`, body: response };
    }
}

export async function enrichLeadWithAI(lead) {
    const systemPrompt = `Sen bir iş araştırma uzmanısın. Verilen bilgilerle kişi hakkında bir özet çıkar. Türkçe yaz.`;
    const prompt = `Bu kişi hakkında bildiğin her şeyi özetle:
İsim: ${lead.name}
Şirket: ${lead.company || ''}
Pozisyon: ${lead.position || ''}
Sektör: ${lead.sector || ''}
Web Sitesi: ${lead.website || ''}`;
    return await callAI(prompt, systemPrompt);
}
