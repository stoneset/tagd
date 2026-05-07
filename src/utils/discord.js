/**
 * Send Discord notification for scan events
 */
export async function sendDiscordNotification(scan, webhookUrl) {
    if (!webhookUrl) return;

    const geo = scan.geo;
    const geoText = `${geo.city}, ${geo.region}, ${geo.country}`;
    const userAgent = scan.userAgent || 'N/A';
    const timestamp = new Date(scan.timestamp).toLocaleString();

    const embed = {
        title: '🔍 QR Code Scanned',
        color: 0x5865f2,
        fields: [
            { name: 'Item ID', value: scan.itemId, inline: true },
            { name: 'IP Address', value: scan.ip, inline: true },
            { name: 'Location', value: geoText, inline: true },
            { name: 'User Agent', value: userAgent, inline: false },
            { name: 'Timestamp', value: timestamp, inline: true },
            { name: 'Language', value: scan.acceptLanguage || 'N/A', inline: true },
        ],
        timestamp: new Date().toISOString(),
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] }),
        });
    } catch (error) {
        console.error('Failed to send Discord notification:', error.message);
    }
}