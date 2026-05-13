import { api } from '../utils/api.js';
import { formatDateTime, getStatusLabel, showToast, createModal } from '../utils/helpers.js';

export async function renderEmails(container) {
    let data = { emails: [] };
    try { data = await api.getEmails(); } catch (e) { console.warn(e); }

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>E-postalar</h1>
                <p class="subtitle">Gönderilen ve taslak tüm e-postalar</p>
            </div>
        </div>

        <div class="tabs" id="email-tabs">
            <div class="tab active" data-filter="">Tümü</div>
            <div class="tab" data-filter="sent">Gönderilen</div>
            <div class="tab" data-filter="draft">Taslak</div>
            <div class="tab" data-filter="replied">Cevaplanan</div>
        </div>

        <div id="emails-list">
            ${data.emails.length === 0 ? `
                <div class="empty-state">
                    <span class="material-icons-round">mail_outline</span>
                    <h3>Henüz e-posta yok</h3>
                    <p>Lead sayfasından AI ile e-posta oluşturun</p>
                </div>
            ` : data.emails.map(email => renderEmailCard(email)).join('')}
        </div>
    `;

    // Tab filtering
    document.getElementById('email-tabs').addEventListener('click', async (e) => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        document.querySelectorAll('#email-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.dataset.filter;
        try {
            const params = filter ? { status: filter } : {};
            const filtered = await api.getEmails(params);
            document.getElementById('emails-list').innerHTML = filtered.emails.length === 0
                ? '<div class="empty-state" style="padding:var(--space-2xl)"><p>Bu kategoride e-posta yok</p></div>'
                : filtered.emails.map(email => renderEmailCard(email)).join('');
        } catch (err) { showToast(err.message, 'error'); }
    });

    // Email actions
    document.getElementById('emails-list').addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const emailId = btn.dataset.id;
        const leadId = btn.dataset.leadId;
        if (btn.dataset.action === 'send-draft') {
            try {
                await api.sendEmail({ email_id: emailId });
                showToast('E-posta gönderildi! 🚀');
                renderEmails(container);
            } catch (err) { showToast(err.message, 'error'); }
        } else if (btn.dataset.action === 'delete-email') {
            if (confirm('E-posta silinsin mi?')) {
                try { await api.deleteEmail(emailId); showToast('Silindi'); renderEmails(container); } catch (err) { showToast(err.message, 'error'); }
            }
        } else if (btn.dataset.action === 'follow-up') {
            try {
                btn.disabled = true;
                btn.innerHTML = '<div class="loader" style="width:14px;height:14px;border-width:2px"></div>';
                const fu = await api.createFollowUp({ lead_id: leadId, original_email_id: emailId });
                showToast('Takip e-postası oluşturuldu');
                renderEmails(container);
            } catch (err) { showToast(err.message, 'error'); btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px">forward_to_inbox</span> Takip'; }
        } else if (btn.dataset.action === 'view-email') {
            try {
                const email = await api.getEmail(emailId);
                createModal(email.subject, `
                    <div style="display:grid;grid-template-columns:auto 1fr;gap:var(--space-md);font-size:var(--font-sm)">
                        <strong>Gönderici:</strong> <span>${email.lead_name || 'Bilinmeyen'}</span>
                        <strong>Durum:</strong> <span class="badge badge-${email.status}">${getStatusLabel(email.status)}</span>
                        <strong>Tür:</strong> <span>${email.type}</span>
                        <strong>Gönderme Tarihi:</strong> <span>${formatDateTime(email.sent_at) || '-'}</span>
                    </div>
                    <div style="margin-top:var(--space-md);padding:var(--space-md);background:var(--bg-glass);border-radius:var(--radius-md);border-left:4px solid var(--accent-purple)">
                        <div style="white-space:pre-wrap;line-height:1.8">${email.body}</div>
                    </div>
                `, {
                    wide: true,
                    footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-overlay').remove()">Kapat</button>`
                });
            } catch (err) { showToast(err.message, 'error'); }
        }
    });
}

function renderEmailCard(email) {
    const typeLabels = { initial: 'İlk E-posta', followup_1: '1. Takip', followup_2: '2. Takip', followup_3: '3. Takip', reply: 'Cevap' };
    const typeColors = { initial: 'var(--accent-blue)', followup_1: 'var(--accent-orange)', followup_2: 'var(--accent-orange)', followup_3: 'var(--accent-red)', reply: 'var(--accent-green)' };

    return `
        <div class="card fade-in-up" style="margin-bottom:var(--space-md)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                        <span style="font-size:var(--font-xs);color:${typeColors[email.type] || 'var(--text-tertiary)'};font-weight:600;text-transform:uppercase">${typeLabels[email.type] || email.type}</span>
                        <span class="badge badge-${email.status}">${getStatusLabel(email.status)}</span>
                    </div>
                    <h4 style="font-size:var(--font-base);font-weight:600;margin-bottom:4px">${email.subject}</h4>
                    <p style="font-size:var(--font-sm);color:var(--text-tertiary)">
                        <span class="material-icons-round" style="font-size:14px;vertical-align:middle">person</span>
                        ${email.lead_name || 'Bilinmeyen'} ${email.lead_company ? `(${email.lead_company})` : ''}
                        ${email.sent_at ? ` · ${formatDateTime(email.sent_at)}` : ''}
                    </p>
                </div>
                <div style="display:flex;gap:4px;flex-shrink:0">
                    ${email.status === 'draft' ? `<button class="btn btn-sm btn-primary" data-action="send-draft" data-id="${email.id}"><span class="material-icons-round" style="font-size:16px">send</span></button>` : ''}
                    ${email.status === 'sent' ? `<button class="btn btn-sm btn-secondary" data-action="follow-up" data-id="${email.id}" data-lead-id="${email.lead_id}"><span class="material-icons-round" style="font-size:16px">forward_to_inbox</span></button>` : ''}
                    <button class="btn btn-sm btn-secondary" data-action="view-email" data-id="${email.id}" title="Detay"><span class="material-icons-round" style="font-size:16px">visibility</span></button>
                    <button class="btn btn-sm btn-danger" data-action="delete-email" data-id="${email.id}"><span class="material-icons-round" style="font-size:16px">delete</span></button>
                </div>
            </div>
            <details style="margin-top:var(--space-sm)">
                <summary style="cursor:pointer;font-size:var(--font-sm);color:var(--text-secondary);user-select:none">İçeriği göster</summary>
                <div style="margin-top:var(--space-sm);padding:var(--space-md);background:var(--bg-glass);border-radius:var(--radius-md);font-size:var(--font-sm);color:var(--text-secondary);line-height:1.8;white-space:pre-wrap">${email.body}</div>
            </details>
        </div>
    `;
}
