import nodemailer from 'nodemailer';
import { error as logError, info as logInfo } from './logger.js';

/**
 * Send email notification for scan events
 */
export async function sendEmailNotification(scan, smtpConfig) {
    logInfo('[EMAIL]', `Attempting to send notification (enabled: ${smtpConfig?.enabled})`);

    if (!smtpConfig || !smtpConfig.enabled) {
        logInfo('[EMAIL]', 'Email disabled or no config, skipping');
        return;
    }

    if (!smtpConfig.to) {
        logError('[EMAIL]', 'No recipient configured');
        return;
    }

    logInfo('[EMAIL]', `Sending to ${smtpConfig.to} via ${smtpConfig.host}:${smtpConfig.port}`);

    const geo = scan.geo;
    const geoText = `${geo.city}, ${geo.region}, ${geo.country}`;
    const userAgent = scan.userAgent || 'N/A';
    const timestamp = new Date(scan.timestamp).toLocaleString();

    const htmlContent = `
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #5865f2;">🔍 ${scan.itemName} Found!</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f5f5f5;">
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Item ID</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${scan.itemId}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Item Name</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${scan.itemName}</td>
                    </tr>
                    <tr style="background: #f5f5f5;">
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">IP Address</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${scan.ip}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Location</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${geoText}</td>
                    </tr>
                    <tr style="background: #f5f5f5;">
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">User Agent</td>
                        <td style="padding: 10px; border: 1px solid #ddd; font-size: 12px;">${userAgent}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Timestamp</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${timestamp}</td>
                    </tr>
                    <tr style="background: #f5f5f5;">
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Language</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${scan.acceptLanguage || 'N/A'}</td>
                    </tr>
                </table>
                <p style="color: #999; font-size: 12px; margin-top: 20px;">This is an automated notification from tagd.</p>
            </body>
        </html>
    `;

    const textContent = `
${scan.itemName} Found!
=======================

Item ID: ${scan.itemId}
IP Address: ${scan.ip}
Location: ${geoText}
User Agent: ${userAgent}
Timestamp: ${timestamp}
Language: ${scan.acceptLanguage || 'N/A'}
    `;

    try {
        logInfo('[EMAIL]', `Creating SMTP transport (secure: ${smtpConfig.secure})`);
        const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure || false,
            auth: smtpConfig.user && smtpConfig.pass ? {
                user: smtpConfig.user,
                pass: smtpConfig.pass,
            } : undefined,
            connectionTimeout: 5000,
            socketTimeout: 5000,
        });

        logInfo('[EMAIL]', `Sending mail to ${smtpConfig.to}...`);
        await transporter.sendMail({
            from: smtpConfig.from || smtpConfig.user || 'noreply@tagd.local',
            to: smtpConfig.to,
            subject: `🔍 ${scan.itemName} Found!`,
            text: textContent,
            html: htmlContent,
        });

        logInfo('[EMAIL]', `Notification sent to ${smtpConfig.to}`);
    } catch (error) {
        logError('[EMAIL]', `Failed: ${error.code || error.message}`);
    }
}