import { renderSidebar } from './components/sidebar.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderLeads } from './pages/leads.js';
import { renderCampaigns } from './pages/campaigns.js';
import { renderEmails } from './pages/emails.js';
import { renderSettings } from './pages/settings.js';
import { api } from './utils/api.js';

const ADMIN_SESSION_KEY = 'lf_admin_ok';

function isAdminAuthed() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
}

function renderAdminLogin(container) {
    container.innerHTML = `
        <div class="empty-state" style="max-width:360px;margin:80px auto">
            <span class="material-icons-round" style="font-size:48px;color:var(--accent-cyan)">lock</span>
            <h3>Yönetici Girişi</h3>
            <p>Ayarlara erişmek için şifreyi girin.</p>
            <div style="display:flex;gap:8px;margin-top:16px">
                <input id="admin-pass-input" type="password" class="form-control"
                    placeholder="Şifre" style="flex:1"
                    onkeydown="if(event.key==='Enter')document.getElementById('admin-pass-btn').click()">
                <button id="admin-pass-btn" class="btn btn-primary">Giriş</button>
            </div>
            <p id="admin-pass-err" style="color:var(--accent-red);margin-top:8px;display:none">Yanlış şifre.</p>
        </div>
    `;
    document.getElementById('admin-pass-btn').addEventListener('click', async () => {
        const btn = document.getElementById('admin-pass-btn');
        const errEl = document.getElementById('admin-pass-err');
        const val = document.getElementById('admin-pass-input').value;

        btn.disabled = true;
        btn.textContent = '...';
        errEl.style.display = 'none';

        try {
            await api.verifyAdminPassword(val);
            sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
            navigate();
        } catch {
            errEl.style.display = '';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Giriş';
        }
    });
}

const pages = {
    dashboard: renderDashboard,
    leads: renderLeads,
    campaigns: renderCampaigns,
    emails: renderEmails,
    settings: (container) => {
        if (!isAdminAuthed()) { renderAdminLogin(container); return; }
        return renderSettings(container);
    },
};

function getPage() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    return hash;
}

async function navigate() {
    const page = getPage();
    const main = document.getElementById('main-content');
    renderSidebar(page);

    main.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Yükleniyor...</p></div>';

    const renderFn = pages[page];
    if (renderFn) {
        try {
            await renderFn(main);
        } catch (err) {
            console.error('Page render error:', err);
            main.innerHTML = `<div class="empty-state">
                <span class="material-icons-round">error_outline</span>
                <h3>Bir hata oluştu</h3>
                <p>${err.message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Yenile</button>
            </div>`;
        }
    } else {
        main.innerHTML = '<div class="empty-state"><span class="material-icons-round">help_outline</span><h3>Sayfa bulunamadı</h3></div>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);
