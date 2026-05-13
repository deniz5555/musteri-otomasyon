export function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
    return formatDate(dateStr);
}

export const statusLabels = {
    new: 'Yeni',
    researched: 'Araştırıldı',
    contacted: 'İletişime Geçildi',
    replied: 'Cevap Geldi',
    converted: 'Dönüştürüldü',
    lost: 'Kayıp',
    draft: 'Taslak',
    active: 'Aktif',
    paused: 'Duraklatıldı',
    completed: 'Tamamlandı',
    sent: 'Gönderildi',
    delivered: 'Teslim Edildi',
    opened: 'Okundu',
    bounced: 'Geri Döndü',
    failed: 'Başarısız',
    pending: 'Beklemede',
};

export function getStatusLabel(status) {
    return statusLabels[status] || status;
}

export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    toast.innerHTML = `<span class="material-icons-round">${icons[type] || 'info'}</span>${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 300ms ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function createModal(title, content, options = {}) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal ${options.wide ? 'modal-wide' : ''}">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" id="modal-close-btn">
                    <span class="material-icons-round">close</span>
                </button>
            </div>
            <div class="modal-body">${content}</div>
            ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
        </div>
    `;

    document.getElementById('modal-root').appendChild(overlay);
    overlay.querySelector('#modal-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    return overlay;
}

export function closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
}
