import nodemailer from 'nodemailer';
import { getDb } from '../db/database.js';

function getSmtpSettings() {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM settings WHERE key LIKE 'smtp_%'").all();
    const s = {};
    rows.forEach(r => { s[r.key] = r.value; });
    return {
        smtp_host: s.smtp_host || process.env.SMTP_HOST || '',
        smtp_port: s.smtp_port || process.env.SMTP_PORT || '587',
        smtp_user: s.smtp_user || process.env.SMTP_USER || '',
        smtp_pass: s.smtp_pass || process.env.SMTP_PASS || '',
        smtp_from_name: s.smtp_from_name || process.env.SMTP_FROM_NAME || 'AI Otomasyon',
    };
}

function smtpSocketFamily() {
    const n = parseInt(process.env.SMTP_IP_FAMILY || '4', 10);
    return n === 6 ? 6 : 4;
}

function createTransporter() {
    const settings = getSmtpSettings();
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

export async function sendEmail({ to, subject, html, text }) {
    const settings = getSmtpSettings();
    const transporter = createTransporter();
    const fromName = settings.smtp_from_name || 'AI Otomasyon';
    const fromEmail = settings.smtp_user;

    const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: html || undefined,
        text: text || undefined
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 E-posta gönderildi: ${to} - ${subject} (${info.messageId})`);
    return info;
}

export async function testSmtpConnection() {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        return { success: true, message: 'SMTP bağlantısı başarılı' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}
