export function renderSidebar(activePage) {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = `
        <div class="sidebar-logo">
            <div class="logo-icon">⚡</div>
            <div>
                <div class="logo-text">LeadForge AI</div>
                <div class="logo-sub">Müşteri Otomasyonu</div>
            </div>
        </div>

        <div class="nav-section">
            <div class="nav-section-title"><span class="nav-label">Ana Menü</span></div>
            <div class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" data-page="dashboard">
                <span class="material-icons-round">dashboard</span>
                <span class="nav-label">Dashboard</span>
            </div>
            <div class="nav-item ${activePage === 'leads' ? 'active' : ''}" data-page="leads">
                <span class="material-icons-round">people</span>
                <span class="nav-label">Potansiyel Müşteriler</span>
            </div>
            <div class="nav-item ${activePage === 'campaigns' ? 'active' : ''}" data-page="campaigns">
                <span class="material-icons-round">campaign</span>
                <span class="nav-label">Kampanyalar</span>
            </div>
            <div class="nav-item ${activePage === 'emails' ? 'active' : ''}" data-page="emails">
                <span class="material-icons-round">email</span>
                <span class="nav-label">E-postalar</span>
            </div>
        </div>

    `;

    sidebar.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            window.location.hash = page;
        });
    });
}
