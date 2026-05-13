-- Müşteri Bulma Otomasyonu - Veritabanı Şeması

CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    position TEXT,
    sector TEXT,
    email TEXT,
    phone TEXT,
    linkedin TEXT,
    website TEXT,
    notes TEXT,
    ai_summary TEXT,
    status TEXT DEFAULT 'new' CHECK(status IN ('new','researched','contacted','replied','converted','lost')),
    source TEXT DEFAULT 'manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sector TEXT,
    target_audience TEXT,
    email_template TEXT,
    email_subject TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','paused','completed')),
    total_leads INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    campaign_id TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'initial' CHECK(type IN ('initial','followup_1','followup_2','followup_3','reply')),
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','delivered','opened','replied','bounced','failed')),
    sent_at DATETIME,
    opened_at DATETIME,
    replied_at DATETIME,
    scheduled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    email_id TEXT,
    message TEXT NOT NULL,
    direction TEXT CHECK(direction IN ('inbound','outbound')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS campaign_leads (
    campaign_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','sent','replied','converted')),
    PRIMARY KEY (campaign_id, lead_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('smtp_host', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('smtp_port', '587');
INSERT OR IGNORE INTO settings (key, value) VALUES ('smtp_user', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('smtp_pass', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('smtp_from_name', 'AI Otomasyon');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_provider', 'openai');
INSERT OR IGNORE INTO settings (key, value) VALUES ('openai_api_key', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('gemini_api_key', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('email_signature', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('followup_1_days', '3');
INSERT OR IGNORE INTO settings (key, value) VALUES ('followup_2_days', '7');
INSERT OR IGNORE INTO settings (key, value) VALUES ('followup_3_days', '14');
INSERT OR IGNORE INTO settings (key, value) VALUES ('email_language', 'tr');
INSERT OR IGNORE INTO settings (key, value) VALUES ('apify_api_key', '');
