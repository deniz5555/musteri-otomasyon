import { renderSidebar } from './components/sidebar.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderLeads } from './pages/leads.js';
import { renderCampaigns } from './pages/campaigns.js';
import { renderEmails } from './pages/emails.js';
import { renderSettings } from './pages/settings.js';

const pages = {
    dashboard: renderDashboard,
    leads: renderLeads,
    campaigns: renderCampaigns,
    emails: renderEmails,
    settings: renderSettings,
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
