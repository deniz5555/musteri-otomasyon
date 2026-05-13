import { api } from '../utils/api.js';
import { formatDate, getStatusLabel, showToast, createModal, closeModal } from '../utils/helpers.js';

export async function renderCampaigns(container) {
    let data = { campaigns: [] };
    try { data = await api.getCampaigns(); } catch (e) { console.warn(e); }

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Kampanyalar</h1>
                <p class="subtitle">E-posta kampanyalarınızı yönetin</p>
            </div>
            <button class="btn btn-primary" id="btn-new-campaign">
                <span class="material-icons-round">add</span> Yeni Kampanya
            </button>
        </div>
        <div id="campaigns-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--space-md)">
            ${data.campaigns.length === 0 ? `
                <div class="empty-state" style="grid-column:1/-1">
                    <span class="material-icons-round">campaign</span>
                    <h3>Henüz kampanya yok</h3>
                    <p>İlk e-posta kampanyanızı oluşturun</p>
                </div>
            ` : data.campaigns.map(c => `
                <div class="card fade-in-up" style="cursor:pointer" data-campaign-id="${c.id}">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-md)">
                        <div>
                            <h3 style="font-size:var(--font-md);font-weight:700">${c.name}</h3>
                            <p style="font-size:var(--font-xs);color:var(--text-tertiary);margin-top:2px">${c.sector || ''} ${c.target_audience ? '· ' + c.target_audience : ''}</p>
                        </div>
                        <span class="badge badge-${c.status}">${getStatusLabel(c.status)}</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-sm);text-align:center">
                        <div style="padding:8px;background:var(--bg-glass);border-radius:var(--radius-sm)">
                            <div style="font-size:var(--font-lg);font-weight:700;color:var(--accent-blue)">${c.total_leads}</div>
                            <div style="font-size:var(--font-xs);color:var(--text-tertiary)">Lead</div>
                        </div>
                        <div style="padding:8px;background:var(--bg-glass);border-radius:var(--radius-sm)">
                            <div style="font-size:var(--font-lg);font-weight:700;color:var(--accent-orange)">${c.sent_count}</div>
                            <div style="font-size:var(--font-xs);color:var(--text-tertiary)">Gönderim</div>
                        </div>
                        <div style="padding:8px;background:var(--bg-glass);border-radius:var(--radius-sm)">
                            <div style="font-size:var(--font-lg);font-weight:700;color:var(--accent-green)">${c.reply_count}</div>
                            <div style="font-size:var(--font-xs);color:var(--text-tertiary)">Cevap</div>
                        </div>
                    </div>
                    <div style="margin-top:var(--space-md);display:flex;justify-content:space-between;align-items:center">
                        <span style="font-size:var(--font-xs);color:var(--text-tertiary)">${formatDate(c.created_at)}</span>
                        <div style="display:flex;gap:4px">
                            ${c.status === 'draft' ? `<button class="btn btn-sm btn-primary" data-action="start" data-id="${c.id}"><span class="material-icons-round" style="font-size:14px">play_arrow</span></button>` : ''}
                            <button class="btn btn-sm btn-danger" data-action="delete-campaign" data-id="${c.id}"><span class="material-icons-round" style="font-size:14px">delete</span></button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('btn-new-campaign').addEventListener('click', () => showNewCampaignModal(container));

    document.getElementById('campaigns-grid').addEventListener('click', async (e) => {
        const card = e.target.closest('[data-campaign-id]');
        const btn = e.target.closest('[data-action]');
        
        if (btn) {
            e.stopPropagation();
            if (btn.dataset.action === 'delete-campaign') {
                if (confirm('Kampanya silinsin mi?')) {
                    try { await api.deleteCampaign(btn.dataset.id); showToast('Kampanya silindi'); renderCampaigns(container); } catch (err) { showToast(err.message, 'error'); }
                }
            } else if (btn.dataset.action === 'start') {
                try { await api.updateCampaign(btn.dataset.id, { status: 'active' }); showToast('Kampanya başlatıldı! 🚀'); renderCampaigns(container); } catch (err) { showToast(err.message, 'error'); }
            }
        } else if (card) {
            showCampaignDetail(card.dataset.campaignId, container);
        }
    });
}

async function showNewCampaignModal(container) {
    let leadsData = { leads: [] };
    try { leadsData = await api.getLeads({ limit: 100 }); } catch (e) {}

    const content = `
        <div class="form-group"><label class="form-label">Kampanya Adı *</label><input class="form-input" id="c-name" placeholder="Örn: İstanbul Diş Klinikleri"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
            <div class="form-group"><label class="form-label">Sektör</label><input class="form-input" id="c-sector" placeholder="Diş Hekimliği"></div>
            <div class="form-group"><label class="form-label">Hedef Kitle</label><input class="form-input" id="c-target" placeholder="Klinik sahipleri"></div>
        </div>
        <div class="form-group"><label class="form-label">E-posta Konu Şablonu</label><input class="form-input" id="c-subject" placeholder="AI destekli hizmeti sunuyoruz"></div>
        <div class="form-group"><label class="form-label">Lead Seçimi</label>
            <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-md);padding:var(--space-sm)">
                ${leadsData.leads.length === 0 ? '<p style="color:var(--text-tertiary);padding:8px">Henüz lead yok. Önce lead ekleyin.</p>' :
                leadsData.leads.map(l => `
                    <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:var(--radius-sm);cursor:pointer" class="nav-item">
                        <input type="checkbox" class="c-lead-check" value="${l.id}" style="accent-color:var(--accent-purple)">
                        <span>${l.name}</span>
                        <span style="color:var(--text-tertiary);font-size:var(--font-xs);margin-left:auto">${l.company || ''}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
    createModal('Yeni Kampanya Oluştur', content, {
        wide: true,
        footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-overlay').remove()">İptal</button>
                 <button class="btn btn-primary" id="c-save-btn"><span class="material-icons-round">save</span> Oluştur</button>`
    });

    document.getElementById('c-save-btn').addEventListener('click', async () => {
        const name = document.getElementById('c-name').value.trim();
        if (!name) { showToast('Kampanya adı zorunludur', 'error'); return; }
        const checks = document.querySelectorAll('.c-lead-check:checked');
        const leadIds = Array.from(checks).map(c => c.value);
        try {
            await api.createCampaign({
                name, sector: document.getElementById('c-sector').value,
                target_audience: document.getElementById('c-target').value,
                email_subject: document.getElementById('c-subject').value,
                lead_ids: leadIds
            });
            showToast('Kampanya oluşturuldu!');
            closeModal();
            renderCampaigns(container);
        } catch (err) { showToast(err.message, 'error'); }
    });
}

async function showCampaignDetail(campaignId, container) {
    try {
        const campaign = await api.getCampaign(campaignId);
        const typeLabels = { initial: 'İlk E-posta', followup_1: '1. Takip', followup_2: '2. Takip', followup_3: '3. Takip', reply: 'Cevap' };
        
        const content = `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-md)">
                <div style="padding:var(--space-md);background:var(--bg-glass);border-radius:var(--radius-md)">
                    <div style="font-size:var(--font-sm);color:var(--text-tertiary)">Toplam Lead</div>
                    <div style="font-size:var(--font-2xl);font-weight:700;color:var(--accent-blue);margin-top:4px">${campaign.total_leads || 0}</div>
                </div>
                <div style="padding:var(--space-md);background:var(--bg-glass);border-radius:var(--radius-md)">
                    <div style="font-size:var(--font-sm);color:var(--text-tertiary)">Gönderilen</div>
                    <div style="font-size:var(--font-2xl);font-weight:700;color:var(--accent-orange);margin-top:4px">${campaign.sent_count || 0}</div>
                </div>
                <div style="padding:var(--space-md);background:var(--bg-glass);border-radius:var(--radius-md)">
                    <div style="font-size:var(--font-sm);color:var(--text-tertiary)">Cevaplanan</div>
                    <div style="font-size:var(--font-2xl);font-weight:700;color:var(--accent-green);margin-top:4px">${campaign.reply_count || 0}</div>
                </div>
            </div>

            <div style="margin-bottom:var(--space-md)">
                <h4 style="margin-bottom:var(--space-sm)">Bilgiler</h4>
                <div style="display:grid;grid-template-columns:auto 1fr;gap:var(--space-md);font-size:var(--font-sm)">
                    <strong>Durum:</strong> <span class="badge badge-${campaign.status}">${getStatusLabel(campaign.status)}</span>
                    <strong>Sektör:</strong> <span>${campaign.sector || '-'}</span>
                    <strong>Hedef Kitle:</strong> <span>${campaign.target_audience || '-'}</span>
                    ${campaign.email_subject ? `<strong>E-posta Konusu:</strong> <span>${campaign.email_subject}</span>` : ''}
                </div>
            </div>

            ${campaign.emails && campaign.emails.length > 0 ? `
                <div>
                    <h4 style="margin-bottom:var(--space-sm)">E-postalar (${campaign.emails.length})</h4>
                    <div style="max-height:300px;overflow-y:auto">
                        ${campaign.emails.map(e => `
                            <div style="padding:8px 12px;border:1px solid var(--border-color);border-radius:var(--radius-sm);margin-bottom:8px">
                                <div style="display:flex;justify-content:space-between;gap:8px">
                                    <div style="flex:1;min-width:0">
                                        <div style="font-weight:600;font-size:var(--font-sm)">${e.subject}</div>
                                        <div style="font-size:var(--font-xs);color:var(--text-tertiary);margin-top:2px">${e.lead_name || 'Bilinmeyen'}</div>
                                    </div>
                                    <span class="badge badge-${e.status}" style="flex-shrink:0">${getStatusLabel(e.status)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        createModal(`${campaign.name} - ${getStatusLabel(campaign.status)}`, content, {
            wide: true,
            footer: `${campaign.status === 'active' ? `<button class="btn btn-primary" id="btn-batch-send"><span class="material-icons-round">mail_outline</span> Toplu E-posta Gönder</button>` : ''}
                     <button class="btn btn-secondary" onclick="document.querySelector('.modal-overlay').remove()">Kapat</button>`
        });

        if (campaign.status === 'active') {
            document.getElementById('btn-batch-send')?.addEventListener('click', async () => {
                if (confirm(`${campaign.total_leads} lead'e e-posta gönderilecek. Devam etmek istiyor musunuz?`)) {
                    const btn = document.getElementById('btn-batch-send');
                    btn.disabled = true;
                    btn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px"></div> Gönderiliyor...';
                    try {
                        const result = await api.batchSendEmails(campaignId);
                        const failPart = result.failed > 0 ? ` ${result.failed} başarısız.` : '';
                        const hint = result.errors?.length ? ` ${result.errors[0]}` : '';
                        showToast(`${result.sent} gönderildi.${failPart}${hint}`, result.failed > 0 ? 'error' : 'success');
                        closeModal();
                        renderCampaigns(container);
                    } catch (err) { 
                        showToast(err.message, 'error'); 
                        btn.disabled = false;
                        btn.innerHTML = '<span class="material-icons-round">mail_outline</span> Toplu E-posta Gönder';
                    }
                }
            });
        }
    } catch (err) { showToast(err.message, 'error'); }
}
