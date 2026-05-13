import { api } from '../utils/api.js';
import { formatDate, getStatusLabel, showToast, createModal, closeModal } from '../utils/helpers.js';

export async function renderLeads(container) {
    let leadsData = { leads: [], total: 0 };
    try { leadsData = await api.getLeads(); } catch (e) { console.warn(e); }

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Potansiyel Müşteriler</h1>
                <p class="subtitle">${leadsData.total} kayıt bulundu</p>
            </div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-secondary" id="btn-research-lead">
                    <span class="material-icons-round">manage_search</span>
                    Apify Araştırma
                </button>
                <button class="btn btn-primary" id="btn-add-lead">
                    <span class="material-icons-round">person_add</span>
                    Yeni Lead
                </button>
            </div>
        </div>

        <div class="toolbar">
            <div class="search-input-wrapper">
                <span class="material-icons-round">search</span>
                <input type="text" class="form-input" id="lead-search" placeholder="İsim, şirket veya e-posta ara...">
            </div>
            <select class="form-select" id="lead-filter-status" style="width:auto;min-width:160px">
                <option value="">Tüm Durumlar</option>
                <option value="new">Yeni</option>
                <option value="researched">Araştırıldı</option>
                <option value="contacted">İletişime Geçildi</option>
                <option value="replied">Cevap Geldi</option>
                <option value="converted">Dönüştürüldü</option>
                <option value="lost">Kayıp</option>
            </select>
        </div>

        <div class="table-container fade-in-up">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>İsim / Şirket</th>
                        <th>E-posta</th>
                        <th>Sektör</th>
                        <th>Durum</th>
                        <th>Tarih</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody id="leads-table-body">
                    ${leadsData.leads.length === 0 ? `
                        <tr><td colspan="6">
                            <div class="empty-state">
                                <span class="material-icons-round">person_search</span>
                                <h3>Henüz lead yok</h3>
                                <p>Apify ile araştırma yapın veya manuel ekleyin</p>
                            </div>
                        </td></tr>
                    ` : leadsData.leads.map(lead => renderLeadRow(lead)).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Event listeners
    document.getElementById('btn-add-lead').addEventListener('click', () => showAddLeadModal());
    document.getElementById('btn-research-lead').addEventListener('click', () => showResearchModal());

    let searchTimeout;
    document.getElementById('lead-search').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => filterLeads(e.target.value, document.getElementById('lead-filter-status').value), 300);
    });
    document.getElementById('lead-filter-status').addEventListener('change', (e) => {
        filterLeads(document.getElementById('lead-search').value, e.target.value);
    });

    // Delegate clicks on table
    document.getElementById('leads-table-body').addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'delete') {
            if (confirm('Bu lead silinsin mi?')) {
                try {
                    await api.deleteLead(id);
                    showToast('Lead silindi');
                    renderLeads(container);
                } catch (err) { showToast(err.message, 'error'); }
            }
        } else if (action === 'email') {
            showEmailModal(id);
        } else if (action === 'view') {
            showLeadDetail(id, container);
        }
    });
}

function renderLeadRow(lead) {
    return `<tr class="fade-in-up">
        <td>
            <div style="display:flex;align-items:center;gap:10px">
                <div style="width:36px;height:36px;border-radius:var(--radius-full);background:var(--accent-purple-dim);display:flex;align-items:center;justify-content:center;color:var(--accent-purple);font-weight:700;font-size:var(--font-sm);flex-shrink:0">
                    ${(lead.name || '?')[0].toUpperCase()}
                </div>
                <div>
                    <div style="font-weight:600;cursor:pointer" data-action="view" data-id="${lead.id}">${lead.name}</div>
                    <div style="font-size:var(--font-xs);color:var(--text-tertiary)">${lead.company || ''} ${lead.position ? '· ' + lead.position : ''}</div>
                </div>
            </div>
        </td>
        <td style="color:var(--text-secondary)">${lead.email || '<span style="color:var(--text-tertiary)">-</span>'}</td>
        <td style="color:var(--text-secondary)">${lead.sector || '-'}</td>
        <td><span class="badge badge-${lead.status}">${getStatusLabel(lead.status)}</span></td>
        <td style="color:var(--text-tertiary);font-size:var(--font-sm)">${formatDate(lead.created_at)}</td>
        <td>
            <div style="display:flex;gap:4px">
                <button class="btn btn-sm btn-secondary" data-action="email" data-id="${lead.id}" title="E-posta gönder" ${!lead.email ? 'disabled style="opacity:0.4"' : ''}>
                    <span class="material-icons-round" style="font-size:16px">email</span>
                </button>
                <button class="btn btn-sm btn-secondary" data-action="view" data-id="${lead.id}" title="Detay">
                    <span class="material-icons-round" style="font-size:16px">visibility</span>
                </button>
                <button class="btn btn-sm btn-danger" data-action="delete" data-id="${lead.id}" title="Sil">
                    <span class="material-icons-round" style="font-size:16px">delete</span>
                </button>
            </div>
        </td>
    </tr>`;
}

async function filterLeads(search, status) {
    try {
        const params = {};
        if (search) params.search = search;
        if (status) params.status = status;
        const data = await api.getLeads(params);
        const tbody = document.getElementById('leads-table-body');
        if (data.leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state" style="padding:var(--space-lg)"><p>Sonuç bulunamadı</p></div></td></tr>';
        } else {
            tbody.innerHTML = data.leads.map(l => renderLeadRow(l)).join('');
        }
    } catch (e) { console.error(e); }
}

function showAddLeadModal() {
    const content = `
        <div class="form-group"><label class="form-label">İsim *</label><input class="form-input" id="m-name" placeholder="Ahmet Yılmaz"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
            <div class="form-group"><label class="form-label">Şirket</label><input class="form-input" id="m-company" placeholder="ABC Teknoloji"></div>
            <div class="form-group"><label class="form-label">Pozisyon</label><input class="form-input" id="m-position" placeholder="CEO"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
            <div class="form-group"><label class="form-label">E-posta</label><input class="form-input" id="m-email" placeholder="ahmet@abc.com"></div>
            <div class="form-group"><label class="form-label">Telefon</label><input class="form-input" id="m-phone" placeholder="+90 5xx"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
            <div class="form-group"><label class="form-label">Sektör</label><input class="form-input" id="m-sector" placeholder="Teknoloji"></div>
            <div class="form-group"><label class="form-label">Web Sitesi</label><input class="form-input" id="m-website" placeholder="https://abc.com"></div>
        </div>
        <div class="form-group"><label class="form-label">LinkedIn</label><input class="form-input" id="m-linkedin" placeholder="linkedin.com/in/..."></div>
        <div class="form-group"><label class="form-label">Notlar</label><textarea class="form-textarea" id="m-notes" rows="3" placeholder="Bu kişi hakkında notlar..."></textarea></div>
    `;
    createModal('Yeni Lead Ekle', content, {
        footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-overlay').remove()">İptal</button>
                 <button class="btn btn-primary" id="m-save-lead"><span class="material-icons-round">save</span> Kaydet</button>`
    });
    document.getElementById('m-save-lead').addEventListener('click', async () => {
        const name = document.getElementById('m-name').value.trim();
        if (!name) { showToast('İsim zorunludur', 'error'); return; }
        try {
            await api.createLead({
                name, company: document.getElementById('m-company').value, position: document.getElementById('m-position').value,
                email: document.getElementById('m-email').value, phone: document.getElementById('m-phone').value,
                sector: document.getElementById('m-sector').value, website: document.getElementById('m-website').value,
                linkedin: document.getElementById('m-linkedin').value, notes: document.getElementById('m-notes').value
            });
            showToast('Lead eklendi!');
            closeModal();
            renderLeads(document.getElementById('main-content'));
        } catch (err) { showToast(err.message, 'error'); }
    });
}

function showResearchModal() {
    const content = `
        <p style="color:var(--text-secondary);margin-bottom:var(--space-md)">Apify Google Maps üzerinden potansiyel müşterileri otomatik olarak bulun.</p>
        <div class="form-group"><label class="form-label">Sektör / İş Türü *</label><input class="form-input" id="r-sector" placeholder="Örn: diş kliniği, avukat, restoran"></div>
        <div class="form-group"><label class="form-label">Hedef Kişi Rolü *</label><input class="form-input" id="r-role" placeholder="Örn: sahip, müdür, yönetici"></div>
        <div class="form-group"><label class="form-label">Lokasyon / Ek Bilgi</label><input class="form-input" id="r-desc" placeholder="Örn: İstanbul Kadıköy"></div>
        <div id="r-results" style="margin-top:var(--space-md)"></div>
    `;
    createModal('🔍 Apify ile Lead Araştır', content, {
        wide: true,
        footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-overlay').remove()">İptal</button>
                 <button class="btn btn-primary" id="r-search-btn"><span class="material-icons-round">search</span> Araştır</button>`
    });
    document.getElementById('r-search-btn').addEventListener('click', async () => {
        const sector = document.getElementById('r-sector').value.trim();
        const role = document.getElementById('r-role').value.trim();
        const desc = document.getElementById('r-desc').value.trim();
        if (!sector || !role) { showToast('Sektör ve rol zorunludur', 'error'); return; }

        const btn = document.getElementById('r-search-btn');
        const resultsDiv = document.getElementById('r-results');
        btn.disabled = true;
        btn.innerHTML = '<div class="loader" style="width:18px;height:18px;border-width:2px"></div> Araştırılıyor...';
        resultsDiv.innerHTML = '<div style="text-align:center;padding:var(--space-lg);color:var(--text-secondary)"><div class="loader" style="margin:0 auto var(--space-md)"></div>Apify ile aranıyor, bu birkaç dakika sürebilir...</div>';

        try {
            const data = await api.researchLeads({ sector, targetRole: role, description: desc });
            if (data.leads && data.leads.length > 0) {
                resultsDiv.innerHTML = `
                    <h4 style="margin-bottom:var(--space-sm)">${data.leads.length} sonuç bulundu</h4>
                    <div style="max-height:300px;overflow-y:auto">
                        ${data.leads.map((l, i) => `
                            <div style="padding:12px;border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
                                <div>
                                    <div style="font-weight:600">${l.company || l.name}</div>
                                    <div style="font-size:var(--font-xs);color:var(--text-tertiary)">${l.email || 'E-posta yok'} · ${l.phone || 'Telefon yok'}</div>
                                    ${l.notes ? `<div style="font-size:var(--font-xs);color:var(--text-tertiary);margin-top:4px">${l.notes.split('\n')[0]}</div>` : ''}
                                </div>
                                <input type="checkbox" class="r-lead-check" data-index="${i}" checked style="width:18px;height:18px;accent-color:var(--accent-purple)">
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-primary btn-lg" id="r-save-all" style="width:100%;margin-top:var(--space-md)">
                        <span class="material-icons-round">save</span> Seçilenleri Kaydet
                    </button>
                `;
                document.getElementById('r-save-all').addEventListener('click', async () => {
                    const checks = document.querySelectorAll('.r-lead-check');
                    const selected = [];
                    checks.forEach(c => { if (c.checked) selected.push(data.leads[parseInt(c.dataset.index)]); });
                    if (selected.length === 0) { showToast('Hiç lead seçilmedi', 'error'); return; }
                    try {
                        await api.bulkCreateLeads(selected);
                        showToast(`${selected.length} lead eklendi!`);
                        closeModal();
                        renderLeads(document.getElementById('main-content'));
                    } catch (err) { showToast(err.message, 'error'); }
                });
            } else {
                resultsDiv.innerHTML = '<div class="empty-state"><p>Sonuç bulunamadı. Farklı arama terimleri deneyin.</p></div>';
            }
        } catch (err) {
            resultsDiv.innerHTML = `<div style="color:var(--accent-red);padding:var(--space-md)">${err.message}</div>`;
        }
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons-round">search</span> Tekrar Ara';
    });
}

async function showEmailModal(leadId) {
    const content = `
        <p style="color:var(--text-secondary);margin-bottom:var(--space-md)">AI bu lead için kişiselleştirilmiş bir e-posta oluşturacak.</p>
        <div class="form-group"><label class="form-label">Ek Talimatlar (opsiyonel)</label><textarea class="form-textarea" id="e-instructions" rows="2" placeholder="Örn: Fiyat listesi ekle, daha resmi bir ton kullan"></textarea></div>
        <div id="e-preview" style="margin-top:var(--space-md)"></div>
    `;
    createModal('✉️ AI ile E-posta Oluştur', content, {
        wide: true,
        footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-overlay').remove()">İptal</button>
                 <button class="btn btn-primary" id="e-generate-btn"><span class="material-icons-round">auto_awesome</span> Oluştur</button>`
    });
    document.getElementById('e-generate-btn').addEventListener('click', async () => {
        const btn = document.getElementById('e-generate-btn');
        const preview = document.getElementById('e-preview');
        btn.disabled = true;
        btn.innerHTML = '<div class="loader" style="width:18px;height:18px;border-width:2px"></div> Oluşturuluyor...';
        preview.innerHTML = '<div style="text-align:center;padding:var(--space-lg);color:var(--text-secondary)"><div class="loader" style="margin:0 auto var(--space-md)"></div>AI e-posta yazıyor...</div>';
        try {
            const email = await api.generateEmail({ lead_id: leadId, custom_instructions: document.getElementById('e-instructions').value });
            preview.innerHTML = `
                <div class="email-preview">
                    <div class="email-preview-header">
                        <div class="email-preview-subject">${email.subject}</div>
                        <span class="badge badge-draft">Taslak</span>
                    </div>
                    <div class="email-preview-body">${email.body}</div>
                </div>
                <div style="display:flex;gap:8px;margin-top:var(--space-md)">
                    <button class="btn btn-primary" id="e-send-btn" data-email-id="${email.id}"><span class="material-icons-round">send</span> Gönder</button>
                    <button class="btn btn-secondary" id="e-regenerate-btn"><span class="material-icons-round">refresh</span> Yeniden Oluştur</button>
                </div>
            `;
            document.getElementById('e-send-btn').addEventListener('click', async () => {
                try {
                    await api.sendEmail({ email_id: email.id });
                    showToast('E-posta gönderildi! 🚀');
                    closeModal();
                    renderLeads(document.getElementById('main-content'));
                } catch (err) { showToast(err.message, 'error'); }
            });
            document.getElementById('e-regenerate-btn').addEventListener('click', () => {
                document.getElementById('e-generate-btn').click();
            });
        } catch (err) {
            preview.innerHTML = `<div style="color:var(--accent-red);padding:var(--space-md)">${err.message}</div>`;
        }
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons-round">auto_awesome</span> Oluştur';
    });
}

async function showLeadDetail(leadId, container) {
    try {
        const lead = await api.getLead(leadId);
        const content = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
                <div><span class="form-label">Şirket</span><p>${lead.company || '-'}</p></div>
                <div><span class="form-label">Pozisyon</span><p>${lead.position || '-'}</p></div>
                <div><span class="form-label">E-posta</span><p>${lead.email || '-'}</p></div>
                <div><span class="form-label">Telefon</span><p>${lead.phone || '-'}</p></div>
                <div><span class="form-label">Sektör</span><p>${lead.sector || '-'}</p></div>
                <div><span class="form-label">Web</span><p>${lead.website ? `<a href="${lead.website}" target="_blank">${lead.website}</a>` : '-'}</p></div>
            </div>
            ${lead.ai_summary ? `<div style="margin-top:var(--space-md)"><span class="form-label">AI Özeti</span><p style="color:var(--text-secondary);font-size:var(--font-sm)">${lead.ai_summary}</p></div>` : ''}
            ${lead.notes ? `<div style="margin-top:var(--space-md)"><span class="form-label">Notlar</span><p style="color:var(--text-secondary);font-size:var(--font-sm);white-space:pre-wrap">${lead.notes}</p></div>` : ''}
            ${lead.emails && lead.emails.length > 0 ? `
                <div style="margin-top:var(--space-lg)"><span class="form-label">E-posta Geçmişi (${lead.emails.length})</span>
                    ${lead.emails.map(e => `<div style="padding:8px 12px;border:1px solid var(--border-color);border-radius:var(--radius-sm);margin-top:8px;font-size:var(--font-sm)">
                        <div style="display:flex;justify-content:space-between"><strong>${e.subject}</strong><span class="badge badge-${e.status}">${getStatusLabel(e.status)}</span></div>
                    </div>`).join('')}
                </div>
            ` : ''}
        `;
        createModal(lead.name, content, {
            wide: true,
            footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-overlay').remove()">Kapat</button>
                     ${lead.email ? `<button class="btn btn-primary" id="detail-email-btn"><span class="material-icons-round">email</span> E-posta Gönder</button>` : ''}`
        });
        document.getElementById('detail-email-btn')?.addEventListener('click', () => {
            closeModal();
            showEmailModal(leadId);
        });
    } catch (err) { showToast(err.message, 'error'); }
}
