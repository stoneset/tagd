import { error as logError } from './logger.js';

export async function sendDiscordNotification(scan, webhookUrl) {
    if (!webhookUrl) {
        return;
    }

    const geo = scan.geo;
    const geoText = `${geo.city}, ${geo.region}, ${geo.country}`;
    const userAgent = scan.userAgent || 'N/A';
    const timestamp = new Date(scan.timestamp).toLocaleString();

    const embed = {
        title: `🔍 ${scan.itemName} Found!`,
        description: `Item ID: ${scan.itemId}`,
        color: 0x5865f2,
        fields: [
            { name: 'IP Address', value: scan.ip, inline: true },
            { name: 'Location', value: geoText, inline: true },
            { name: 'User Agent', value: userAgent, inline: false },
            { name: 'Timestamp', value: timestamp, inline: true },
            { name: 'Language', value: scan.acceptLanguage || 'N/A', inline: true },
        ],
        timestamp: new Date().toISOString(),
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] }),
        });

        if (!response.ok) {
            logError('[DISCORD]', `Webhook returned ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        logError('[DISCORD]', `Failed to send notification: ${error.message}`);
    }
}