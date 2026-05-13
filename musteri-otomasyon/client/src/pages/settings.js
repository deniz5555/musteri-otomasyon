import { api } from '../utils/api.js';
import { showToast } from '../utils/helpers.js';

function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export async function renderSettings(container) {
    let settings = {};
    try { settings = await api.getSettings(); } catch (e) { console.warn(e); }

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Ayarlar</h1>
                <p class="subtitle">SMTP / Resend, AI ve Apify yapılandırması</p>
            </div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-secondary" id="btn-test-smtp">
                    <span class="material-icons-round">mail_outline</span> E-posta testi
                </button>
                <button class="btn btn-primary" id="btn-save-settings">
                    <span class="material-icons-round">save</span> Tümünü Kaydet
                </button>
            </div>
        </div>

        <div class="settings-section card fade-in-up" style="animation-delay:0ms">
            <div class="settings-section-title">
                <span class="material-icons-round" style="color:var(--accent-cyan)">alternate_email</span> Gönderim kanalı
            </div>
            <p style="color:var(--text-tertiary);font-size:var(--font-sm);margin-bottom:var(--space-md)">Railway <strong>Hobby / Trial</strong> gibi planlarda giden <strong>SMTP (587) sıkça kapalıdır</strong>; test sürekli <code style="font-size:11px">Connection timeout</code> verir. Bu durumda <a href="https://resend.com" target="_blank" rel="noopener noreferrer">Resend</a> ücretsiz katmanından API key alıp aşağıyı doldurun — gönderim tamamen <strong>HTTPS</strong> ile yapılır.</p>
            <div class="form-group"><label class="form-label">E-posta gönderimi</label>
                <select class="form-select s-input" data-key="email_provider" id="sel-email-provider">
                    <option value="smtp" ${(settings.email_provider || 'smtp') !== 'resend' ? 'selected' : ''}>SMTP (Gmail, Outlook, kendi sunucunuz)</option>
                    <option value="resend" ${settings.email_provider === 'resend' ? 'selected' : ''}>Resend (HTTPS — Railway ile uyumlu)</option>
                </select>
            </div>
            <div class="settings-grid" style="margin-top:var(--space-md)">
                <div class="form-group" style="grid-column:1/-1"><label class="form-label">Resend API Key</label><input class="form-input s-input" data-key="resend_api_key" type="password" value="${escapeAttr(settings.resend_api_key || '')}" placeholder="re_..."></div>
                <div class="form-group" style="grid-column:1/-1"><label class="form-label">Resend Gönderen (From)</label><input class="form-input s-input" data-key="resend_from" value="${escapeAttr(settings.resend_from || '')}" placeholder="LeadForge &lt;onboarding@resend.dev&gt;"></div>
                <p style="grid-column:1/-1;font-size:var(--font-xs);color:var(--text-tertiary);margin:-8px 0 0 0">Tek satır. Ya yalnızca e-posta ya da <code style="font-size:11px">Isim &lt;eposta@alan.com&gt;</code> biçimi; satır sonu ve eksik &gt; kullanmayın.</p>
            </div>
        </div>

        <div class="settings-section card fade-in-up" style="animation-delay:60ms;margin-top:var(--space-md)">
            <div class="settings-section-title">
                <span class="material-icons-round" style="color:var(--accent-blue)">email</span> SMTP E-posta Ayarları
            </div>
            <p style="color:var(--text-tertiary);font-size:var(--font-sm);margin-bottom:var(--space-md)">E-posta göndermek için SMTP sunucu bilgilerinizi girin. Gmail için App Password kullanın.</p>
            <div class="settings-grid">
                <div class="form-group"><label class="form-label">SMTP Host</label><input class="form-input s-input" data-key="smtp_host" value="${settings.smtp_host || ''}" placeholder="smtp.gmail.com"></div>
                <div class="form-group"><label class="form-label">SMTP Port</label><input class="form-input s-input" data-key="smtp_port" value="${settings.smtp_port || '587'}" placeholder="587"></div>
                <div class="form-group"><label class="form-label">E-posta Adresi</label><input class="form-input s-input" data-key="smtp_user" value="${settings.smtp_user || ''}" placeholder="you@gmail.com"></div>
                <div class="form-group"><label class="form-label">Şifre / App Password</label><input class="form-input s-input" data-key="smtp_pass" type="password" value="${settings.smtp_pass || ''}" placeholder="••••••••"></div>
                <div class="form-group"><label class="form-label">Gönderen Adı</label><input class="form-input s-input" data-key="smtp_from_name" value="${settings.smtp_from_name || ''}" placeholder="Şirket Adı"></div>
            </div>
        </div>

        <div class="settings-section card fade-in-up" style="animation-delay:100ms;margin-top:var(--space-md)">
            <div class="settings-section-title">
                <span class="material-icons-round" style="color:var(--accent-purple)">auto_awesome</span> AI Ayarları (OpenAI)
            </div>
            <p style="color:var(--text-tertiary);font-size:var(--font-sm);margin-bottom:var(--space-md)">Kişiselleştirilmiş e-postalar yazmak için OpenAI API kullanılıyor.</p>
            <div class="settings-grid">
                <div class="form-group"><label class="form-label">AI Sağlayıcı</label>
                    <select class="form-select s-input" data-key="ai_provider">
                        <option value="openai" ${settings.ai_provider === 'openai' ? 'selected' : ''}>OpenAI (GPT)</option>
                        <option value="gemini" ${settings.ai_provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">OpenAI API Key</label><input class="form-input s-input" data-key="openai_api_key" type="password" value="${settings.openai_api_key || ''}" placeholder="sk-..."></div>
                <div class="form-group"><label class="form-label">Gemini API Key</label><input class="form-input s-input" data-key="gemini_api_key" type="password" value="${settings.gemini_api_key || ''}" placeholder="AI..."></div>
                <div class="form-group"><label class="form-label">E-posta Dili</label>
                    <select class="form-select s-input" data-key="email_language">
                        <option value="tr" ${settings.email_language === 'tr' ? 'selected' : ''}>Türkçe</option>
                        <option value="en" ${settings.email_language === 'en' ? 'selected' : ''}>İngilizce</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="settings-section card fade-in-up" style="animation-delay:200ms;margin-top:var(--space-md)">
            <div class="settings-section-title">
                <span class="material-icons-round" style="color:var(--accent-green)">manage_search</span> Apify Ayarları
            </div>
            <p style="color:var(--text-tertiary);font-size:var(--font-sm);margin-bottom:var(--space-md)">Google Maps üzerinden lead bulmak için Apify API kullanılıyor.</p>
            <div class="settings-grid">
                <div class="form-group"><label class="form-label">Apify API Key</label><input class="form-input s-input" data-key="apify_api_key" type="password" value="${settings.apify_api_key || ''}" placeholder="apify_api_..."></div>
            </div>
        </div>

        <div class="settings-section card fade-in-up" style="animation-delay:300ms;margin-top:var(--space-md)">
            <div class="settings-section-title">
                <span class="material-icons-round" style="color:var(--accent-orange)">schedule</span> Takip E-posta Zamanlaması
            </div>
            <p style="color:var(--text-tertiary);font-size:var(--font-sm);margin-bottom:var(--space-md)">Cevap gelmezse kaç gün sonra takip e-postası gönderilsin.</p>
            <div class="settings-grid">
                <div class="form-group"><label class="form-label">1. Takip (gün)</label><input class="form-input s-input" data-key="followup_1_days" type="number" value="${settings.followup_1_days || '3'}"></div>
                <div class="form-group"><label class="form-label">2. Takip (gün)</label><input class="form-input s-input" data-key="followup_2_days" type="number" value="${settings.followup_2_days || '7'}"></div>
                <div class="form-group"><label class="form-label">3. Takip (gün)</label><input class="form-input s-input" data-key="followup_3_days" type="number" value="${settings.followup_3_days || '14'}"></div>
            </div>
            <div style="margin-top:var(--space-md);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <button class="btn btn-secondary" id="btn-run-followups">
                    <span class="material-icons-round">autorenew</span> Takip Kontrolünü Şimdi Çalıştır
                </button>
                <span style="color:var(--text-tertiary);font-size:var(--font-sm)">Bu buton, planlı takip kontrolünü hemen tetikler.</span>
            </div>
        </div>

        <div class="settings-section card fade-in-up" style="animation-delay:400ms;margin-top:var(--space-md)">
            <div class="settings-section-title">
                <span class="material-icons-round" style="color:var(--accent-cyan)">draw</span> E-posta İmzası
            </div>
            <div class="form-group"><textarea class="form-textarea s-input" data-key="email_signature" rows="4" placeholder="İsminiz&#10;Unvanınız&#10;+90 5xx xxx xx xx&#10;www.sirketiniz.com">${settings.email_signature || ''}</textarea></div>
        </div>
    `;

    document.getElementById('btn-save-settings').addEventListener('click', async () => {
        const inputs = document.querySelectorAll('.s-input');
        const updates = {};
        inputs.forEach(input => {
            const key = input.dataset.key;
            updates[key] = input.value;
        });
        try {
            await api.updateSettings(updates);
            showToast('Ayarlar kaydedildi! ✅');
        } catch (err) { showToast(err.message, 'error'); }
    });

    document.getElementById('btn-test-smtp').addEventListener('click', async () => {
        const btn = document.getElementById('btn-test-smtp');
        const originalHtml = btn.innerHTML;
        const inputs = document.querySelectorAll('.s-input');
        const updates = {};
        inputs.forEach(input => {
            updates[input.dataset.key] = input.value;
        });
        btn.disabled = true;
        btn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px"></div> Test Ediliyor...';
        try {
            await api.updateSettings(updates);
            const response = await fetch('/api/settings/test-smtp', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                showToast(
                    data.provider === 'resend'
                        ? 'Resend API bağlantısı başarılı (HTTPS).'
                        : 'SMTP bağlantısı başarılı.',
                    'success'
                );
            } else {
                showToast(`SMTP hatası: ${data.message}`, 'error');
            }
        } catch (err) { 
            showToast(`Test başarısız: ${err.message}`, 'error'); 
        }
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    });

    document.getElementById('btn-run-followups').addEventListener('click', async () => {
        const btn = document.getElementById('btn-run-followups');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px"></div> Çalıştırılıyor...';
        try {
            const result = await api.runFollowUps();
            showToast(`Takip kontrolü tamamlandı: ${result.processed} e-posta gönderildi`, 'success');
        } catch (err) {
            showToast(`Takip kontrolü başarısız: ${err.message}`, 'error');
        }
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    });
}
