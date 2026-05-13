import { api } from '../utils/api.js';
import { timeAgo, getStatusLabel } from '../utils/helpers.js';

export async function renderDashboard(container) {
    let stats = { totalLeads: 0, contactedLeads: 0, totalEmails: 0, repliedEmails: 0, replyRate: 0, activeCampaigns: 0, convertedLeads: 0, recentActivity: [] };

    try {
        stats = await api.getDashboardStats();
    } catch (e) {
        console.warn('Stats yüklenemedi:', e.message);
    }

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Dashboard</h1>
                <p class="subtitle">Müşteri bulma otomasyonunuzun genel görünümü</p>
            </div>
            <div style="display:flex;gap:8px;">
                <button class="btn btn-primary" id="btn-quick-research">
                    <span class="material-icons-round">search</span>
                    Hızlı Araştırma
                </button>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card fade-in-up" style="animation-delay:0ms">
                <div class="stat-icon" style="background:var(--accent-blue-dim);color:var(--accent-blue)">
                    <span class="material-icons-round">people</span>
                </div>
                <div class="stat-value">${stats.totalLeads}</div>
                <div class="stat-label">Toplam Lead</div>
            </div>
            <div class="stat-card fade-in-up" style="animation-delay:80ms">
                <div class="stat-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">
                    <span class="material-icons-round">send</span>
                </div>
                <div class="stat-value">${stats.totalEmails}</div>
                <div class="stat-label">Gönderilen E-posta</div>
            </div>
            <div class="stat-card fade-in-up" style="animation-delay:160ms">
                <div class="stat-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">
                    <span class="material-icons-round">reply</span>
                </div>
                <div class="stat-value">%${stats.replyRate}</div>
                <div class="stat-label">Cevap Oranı</div>
            </div>
            <div class="stat-card fade-in-up" style="animation-delay:240ms">
                <div class="stat-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">
                    <span class="material-icons-round">handshake</span>
                </div>
                <div class="stat-value">${stats.convertedLeads}</div>
                <div class="stat-label">Dönüştürülen</div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
            <div class="card fade-in-up" style="animation-delay:320ms">
                <h3 style="margin-bottom:var(--space-md);font-size:var(--font-md);display:flex;align-items:center;gap:8px">
                    <span class="material-icons-round" style="color:var(--accent-purple)">history</span>
                    Son Aktiviteler
                </h3>
                <ul class="activity-list" id="activity-list">
                    ${stats.recentActivity.length === 0 ? '<div class="empty-state" style="padding:var(--space-lg)"><span class="material-icons-round" style="font-size:40px">inbox</span><p style="margin-top:8px">Henüz aktivite yok</p></div>' : ''}
                    ${stats.recentActivity.map(act => `
                        <li class="activity-item">
                            <div class="activity-icon" style="background:${act.status === 'replied' ? 'var(--accent-green-dim)' : act.status === 'sent' ? 'var(--accent-blue-dim)' : 'var(--bg-glass)'};color:${act.status === 'replied' ? 'var(--accent-green)' : act.status === 'sent' ? 'var(--accent-blue)' : 'var(--text-tertiary)'}">
                                <span class="material-icons-round">${act.status === 'replied' ? 'reply' : act.status === 'sent' ? 'send' : 'drafts'}</span>
                            </div>
                            <div class="activity-content">
                                <div class="activity-title">${act.lead_name || 'Bilinmeyen'} - ${act.subject || ''}</div>
                                <div class="activity-meta">${getStatusLabel(act.status)} · ${timeAgo(act.sent_at || act.created_at)}</div>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="card fade-in-up" style="animation-delay:400ms">
                <h3 style="margin-bottom:var(--space-md);font-size:var(--font-md);display:flex;align-items:center;gap:8px">
                    <span class="material-icons-round" style="color:var(--accent-cyan)">rocket_launch</span>
                    Hızlı Başlangıç
                </h3>
                <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0">
                    <a href="#leads" class="nav-item" style="padding:12px 16px;border:1px solid var(--border-color);border-radius:var(--radius-md)">
                        <span class="material-icons-round" style="color:var(--accent-blue)">person_add</span>
                        <div>
                            <div style="font-weight:600;color:var(--text-primary)">Yeni Lead Ekle</div>
                            <div style="font-size:var(--font-xs);color:var(--text-tertiary)">Manuel olarak potansiyel müşteri ekleyin</div>
                        </div>
                    </a>
                    <a href="#leads" class="nav-item" style="padding:12px 16px;border:1px solid var(--border-color);border-radius:var(--radius-md)" id="link-research">
                        <span class="material-icons-round" style="color:var(--accent-green)">manage_search</span>
                        <div>
                            <div style="font-weight:600;color:var(--text-primary)">Apify ile Araştır</div>
                            <div style="font-size:var(--font-xs);color:var(--text-tertiary)">Google Maps'ten otomatik lead bulun</div>
                        </div>
                    </a>
                    <a href="#campaigns" class="nav-item" style="padding:12px 16px;border:1px solid var(--border-color);border-radius:var(--radius-md)">
                        <span class="material-icons-round" style="color:var(--accent-orange)">campaign</span>
                        <div>
                            <div style="font-weight:600;color:var(--text-primary)">Kampanya Oluştur</div>
                            <div style="font-size:var(--font-xs);color:var(--text-tertiary)">Toplu e-posta kampanyası başlatın</div>
                        </div>
                    </a>
                    <a href="#settings" class="nav-item" style="padding:12px 16px;border:1px solid var(--border-color);border-radius:var(--radius-md)">
                        <span class="material-icons-round" style="color:var(--accent-purple)">tune</span>
                        <div>
                            <div style="font-weight:600;color:var(--text-primary)">Ayarları Yapılandır</div>
                            <div style="font-size:var(--font-xs);color:var(--text-tertiary)">SMTP, AI ve Apify ayarlarını girin</div>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-quick-research')?.addEventListener('click', () => {
        window.location.hash = 'leads';
    });
}
