import nodemailer from 'nodemailer';
import { log } from './logger.js';

const clip = (value, max) => {
    const text = String(value ?? '') || 'N/A';
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
};

const escapeHtml = (value) =>
    String(value ?? 'N/A').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function describe(scan) {
    const { city, region, country } = scan.geo;
    return {
        title: `🔍 ${scan.itemName} found!`,
        fields: [
            ['Item ID', scan.itemId],
            ['IP address', scan.ip],
            ['Location', `${city}, ${region}, ${country}`],
            ['User agent', scan.userAgent],
            ['Language', scan.acceptLanguage],
        ],
    };
}

function discordPayload(scan) {
    const { title, fields } = describe(scan);
    return {
        embeds: [{
            title: clip(title, 256),
            color: 0x5865f2,
            // Discord rejects the whole webhook if a field value exceeds 1024 chars
            fields: fields.map(([name, value]) => ({ name, value: clip(value, 1024), inline: name !== 'User agent' })),
            timestamp: scan.timestamp,
        }],
        allowed_mentions: { parse: [] },
    };
}

export function buildEmail(scan) {
    const { title, fields } = describe(scan);
    const rows = [...fields, ['Time', new Date(scan.timestamp).toLocaleString()]];
    const cell = 'padding:10px;border:1px solid #ddd;';
    const html = `<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#5865f2;">${escapeHtml(title)}</h2>
<table style="width:100%;border-collapse:collapse;">
${rows.map(([k, v], i) => `<tr${i % 2 ? '' : ' style="background:#f5f5f5;"'}><td style="${cell}font-weight:bold;">${escapeHtml(k)}</td><td style="${cell}">${escapeHtml(v)}</td></tr>`).join('\n')}
</table>
<p style="color:#999;font-size:12px;margin-top:20px;">Automated notification from tagd.</p>
</body></html>`;
    const text = `${title}\n\n${rows.map(([k, v]) => `${k}: ${v ?? 'N/A'}`).join('\n')}\n`;
    return { subject: title, html, text };
}

export function createNotifier({ discordWebhookUrl, smtp }) {
    const transporter = smtp
        ? nodemailer.createTransport({
              host: smtp.host,
              port: smtp.port,
              secure: Boolean(smtp.secure),
              auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
              connectionTimeout: 5000,
              socketTimeout: 5000,
          })
        : null;

    async function sendDiscord(scan) {
        const res = await fetch(discordWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordPayload(scan)),
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`webhook returned ${res.status} ${await res.text()}`);
        log.debug('DISCORD', 'Notification sent');
    }

    async function sendEmail(scan) {
        await transporter.sendMail({ from: smtp.from || smtp.user, to: smtp.to, ...buildEmail(scan) });
        log.debug('EMAIL', `Notification sent to ${smtp.to}`);
    }

    return async function notify(scan) {
        const tasks = [];
        if (discordWebhookUrl) tasks.push(sendDiscord(scan).catch((err) => log.error('DISCORD', err.message)));
        if (transporter) tasks.push(sendEmail(scan).catch((err) => log.error('EMAIL', err.code || err.message)));
        await Promise.all(tasks);
    };
}
