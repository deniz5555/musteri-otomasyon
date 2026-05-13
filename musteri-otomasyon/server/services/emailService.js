import nodemailer from 'nodemailer';
import { getDb } from '../db/database.js';

function loadSettingsRow() {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const s = {};
    rows.forEach((r) => {
        s[r.key] = r.value;
    });
    return s;
}

/** SMTP + gönderim kanalı (Resend / SMTP) ayarları */
export function getMailSettings() {
    const s = loadSettingsRow();
    const provider = String(s.email_provider || process.env.EMAIL_PROVIDER || 'smtp')
        .trim()
        .toLowerCase();
    return {
        email_provider: provider === 'resend' ? 'resend' : 'smtp',
        smtp_host: s.smtp_host || process.env.SMTP_HOST || '',
        smtp_port: s.smtp_port || process.env.SMTP_PORT || '587',
        smtp_user: s.smtp_user || process.env.SMTP_USER || '',
        smtp_pass: s.smtp_pass || process.env.SMTP_PASS || '',
        smtp_from_name: s.smtp_from_name || process.env.SMTP_FROM_NAME || 'AI Otomasyon',
        resend_api_key: (s.resend_api_key || process.env.RESEND_API_KEY || '').trim(),
        resend_from: (s.resend_from || process.env.RESEND_FROM || '').trim(),
    };
}

/**
 * Resend `from` alanı: yalnızca `email@domain.com` veya `İsim <email@domain.com>` (tek satır, düzgün <>).
 * Kopyala-yapışır satır sonları / akıllı tırnak sık hataya yol açar.
 */
export function normalizeResendFrom(raw, displayNameFallback = 'LeadForge') {
    let s = String(raw || '')
        .replace(/\uFEFF/g, '')
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!s) {
        throw new Error(
            'Resend "Gönderen" boş. Örnek: onboarding@resend.dev veya LeadForge <onboarding@resend.dev> (tek satır).'
        );
    }

    const emailOnly = /^[^\s<>]+@[^\s<>]+$/;
    if (emailOnly.test(s)) {
        const name = String(displayNameFallback || 'LeadForge')
            .replace(/[\r\n<>]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^["']|["']$/g, '') || 'LeadForge';
        return `${name} <${s}>`;
    }

    const bracket = s.match(/^(.+?)<\s*([^<>]+?)\s*>$/);
    if (bracket) {
        let name = bracket[1].trim().replace(/^["']+|["']+$/g, '').replace(/\s+/g, ' ').trim();
        const email = bracket[2].trim();
        if (!emailOnly.test(email)) {
            throw new Error(
                `Resend "Gönderen" içindeki e-posta geçersiz: "${email}". Örnek: LeadForge <onboarding@resend.dev>`
            );
        }
        if (!name) name = String(displayNameFallback || 'LeadForge').replace(/[\r\n<>]/g, ' ').trim() || 'LeadForge';
        return `${name} <${email}>`;
    }

    if (s.includes('<') && !s.includes('>')) {
        throw new Error(
            'Resend "Gönderen" eksik kapanış: `>` karakteri olmalı. Örnek: LeadForge <onboarding@resend.dev>'
        );
    }

    throw new Error(
        'Resend "Gönderen" geçersiz. İzin verilen biçimler: (1) sadece e-posta onboarding@resend.dev (2) İsim <eposta@alan.com> — satır sonu kullanmayın, tırnakları düz " veya hiç kullanmayın.'
    );
}

function smtpSocketFamily() {
    const n = parseInt(process.env.SMTP_IP_FAMILY || '4', 10);
    return n === 6 ? 6 : 4;
}

function createTransporter() {
    const settings = getMailSettings();
    if (!settings.smtp_host || !settings.smtp_user) {
        throw new Error('SMTP ayarları yapılandırılmamış. Lütfen Ayarlar sayfasından SMTP bilgilerinizi girin.');
    }
    const port = parseInt(settings.smtp_port, 10) || 587;
    const debug = process.env.SMTP_DEBUG === '1';
    return nodemailer.createTransport({
        host: settings.smtp_host.trim(),
        port,
        secure: port === 465,
        requireTLS: port === 587,
        family: smtpSocketFamily(),
        connectionTimeout: 35_000,
        greetingTimeout: 20_000,
        socketTimeout: 60_000,
        tls: {
            minVersion: 'TLSv1.2',
            servername: settings.smtp_host.trim(),
        },
        auth: { user: settings.smtp_user, pass: settings.smtp_pass },
        debug,
        logger: debug,
    });
}

/**
 * Resend İngilizce hata metinlerini kullanıcı için Türkçe / işlem adımlarıyla zenginleştirir.
 */
function formatResendClientError(raw) {
    const msg = typeof raw === 'string' ? raw : String(raw || '');
    if (!msg) return raw;
    const l = msg.toLowerCase();
    if (l.includes('only send testing emails') || (l.includes('verify a domain') && l.includes('recipients'))) {
        return [
            'Resend test adresi (ör. onboarding@resend.dev) ile yalnızca Resend hesabınıza kayıtlı kendi e-postanıza gönderim yapılabilir.',
            'Lead veya başka alıcılara göndermek için https://resend.com/domains adresinde kendi alan adınızı doğrulayın; ardından "Resend Gönderen (From)" alanını o domainden bir adres yapın (ör. Firma Adı <iletisim@sirketiniz.com>).',
        ].join(' ');
    }
    return msg;
}

/**
 * Resend REST API (HTTPS). Railway Hobby vb. planda SMTP portu kapalıyken kullanılır.
 * @see https://resend.com/docs/api-reference/emails/send-email
 */
async function sendViaResend(cfg, { to, subject, html, text }) {
    if (!cfg.resend_api_key) {
        throw new Error('Resend API anahtarı eksik (resend_api_key veya RESEND_API_KEY).');
    }
    if (!cfg.resend_from) {
        throw new Error(
            'Resend "Gönderen" eksik. Örn: LeadForge <onboarding@resend.dev> veya doğrulanmış alan adınız.'
        );
    }

    const from = normalizeResendFrom(cfg.resend_from, cfg.smtp_from_name);

    const body = {
        from,
        to: [to],
        subject,
    };
    if (html) body.html = html;
    if (text) body.text = text;
    if (!body.html && !body.text) body.text = '';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    let res;
    try {
        res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${cfg.resend_api_key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const raw = data.message || data.name || (typeof data === 'string' ? data : JSON.stringify(data));
        throw new Error(formatResendClientError(raw) || `Resend HTTP ${res.status}`);
    }
    const id = data.id || data?.data?.id || 'unknown';
    console.log(`📧 Resend e-posta: ${to} - ${subject} (${id})`);
    return { messageId: id, provider: 'resend' };
}

export async function sendEmail({ to, subject, html, text }) {
    const cfg = getMailSettings();

    if (cfg.email_provider === 'resend') {
        return sendViaResend(cfg, { to, subject, html, text });
    }

    const transporter = createTransporter();
    const fromName = cfg.smtp_from_name || 'AI Otomasyon';
    const fromEmail = cfg.smtp_user;

    const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: html || undefined,
        text: text || undefined,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 E-posta gönderildi: ${to} - ${subject} (${info.messageId})`);
    return info;
}

/** Resend API anahtarını doğrula (HTTPS, SMTP portu gerekmez) */
async function testResendConnection(cfg) {
    if (!cfg.resend_api_key) {
        return { success: false, provider: 'resend', message: 'Resend API anahtarı girilmemiş.' };
    }
    if (cfg.resend_from) {
        try {
            normalizeResendFrom(cfg.resend_from, cfg.smtp_from_name);
        } catch (e) {
            return { success: false, provider: 'resend', message: e.message };
        }
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
        const res = await fetch('https://api.resend.com/domains', {
            method: 'GET',
            headers: { Authorization: `Bearer ${cfg.resend_api_key}` },
            signal: controller.signal,
        });
        if (res.ok) {
            return {
                success: true,
                provider: 'resend',
                message:
                    'Resend API erişimi başarılı. Not: onboarding@resend.dev ile yalnızca hesap e-postanıza test gönderilir; leadlere göndermek için resend.com/domains üzerinden domain doğrulayıp From adresini güncelleyin.',
            };
        }
        const data = await res.json().catch(() => ({}));
        return {
            success: false,
            provider: 'resend',
            message: data.message || `Resend HTTP ${res.status}`,
        };
    } catch (e) {
        if (e.name === 'AbortError') {
            return { success: false, provider: 'resend', message: 'Resend API isteği zaman aşımına uğradı.' };
        }
        return { success: false, provider: 'resend', message: e.message };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Aktif gönderim kanalına göre bağlantı testi (Resend veya SMTP).
 */
export async function testEmailConnection() {
    const cfg = getMailSettings();
    if (cfg.email_provider === 'resend') {
        return testResendConnection(cfg);
    }
    try {
        const transporter = createTransporter();
        await transporter.verify();
        return { success: true, provider: 'smtp', message: 'SMTP bağlantısı başarılı' };
    } catch (error) {
        return {
            success: false,
            provider: 'smtp',
            message: `${error.message} — Railway Hobby planda giden SMTP kapalı olabilir; Ayarlarda "Resend (HTTPS)" seçin.`,
        };
    }
}

/** Geriye dönük uyumluluk */
export async function testSmtpConnection() {
    return testEmailConnection();
}
