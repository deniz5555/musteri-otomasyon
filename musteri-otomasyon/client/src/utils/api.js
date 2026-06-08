const API_BASE = '/api';

async function request(url, options = {}) {
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    const res = await fetch(`${API_BASE}${url}`, config);
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(
            'Sunucu geçerli JSON döndürmedi (çoğunlukla API rotası yerine HTML sayfası geldi). Sunucu rotalarını kontrol edin.'
        );
    }
    if (!res.ok) throw new Error(data.error || 'Bir hata oluştu');
    return data;
}

export const api = {
    // Dashboard
    getDashboardStats: () => request('/dashboard/stats'),

    // Leads
    getLeads: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/leads${query ? '?' + query : ''}`);
    },
    getLead: (id) => request(`/leads/${id}`),
    createLead: (data) => request('/leads', { method: 'POST', body: data }),
    updateLead: (id, data) => request(`/leads/${id}`, { method: 'PUT', body: data }),
    deleteLead: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
    researchLeads: (data) => request('/leads/research', { method: 'POST', body: data }),
    bulkCreateLeads: (leads) => request('/leads/bulk', { method: 'POST', body: { leads } }),

    // Campaigns
    getCampaigns: () => request('/campaigns'),
    getCampaign: (id) => request(`/campaigns/${id}`),
    createCampaign: (data) => request('/campaigns', { method: 'POST', body: data }),
    updateCampaign: (id, data) => request(`/campaigns/${id}`, { method: 'PUT', body: data }),
    deleteCampaign: (id) => request(`/campaigns/${id}`, { method: 'DELETE' }),
    addLeadsToCampaign: (id, leadIds) => request(`/campaigns/${id}/leads`, { method: 'POST', body: { lead_ids: leadIds } }),

    // Emails
    getEmails: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/emails${query ? '?' + query : ''}`);
    },
    getEmail: (id) => request(`/emails/${id}`),
    generateEmail: (data) => request('/emails/generate', { method: 'POST', body: data }),
    sendEmail: (data) => request('/emails/send', { method: 'POST', body: data }),
    batchSendEmails: (campaignId) => request('/emails/batch-send', { method: 'POST', body: { campaign_id: campaignId } }),
    createFollowUp: (data) => request('/emails/follow-up', { method: 'POST', body: data }),
    updateEmail: (id, data) => request(`/emails/${id}`, { method: 'PUT', body: data }),
    deleteEmail: (id) => request(`/emails/${id}`, { method: 'DELETE' }),

    // Follow-up
    runFollowUps: () => request('/follow-ups/run', { method: 'POST' }),

    // Auth
    verifyAdminPassword: (password) => request('/auth/verify', { method: 'POST', body: { password } }),

    // Settings
    getSettings: () => request('/settings'),
    updateSettings: (data) => request('/settings', { method: 'PUT', body: data }),
};
