# tagd 🏷️

A self-hosted QR code scan logger with Discord notifications and email alerts. Perfect for tracking found items, personal belongings, or inventory.

## Features

- **QR Code Scanning**: When someone scans a QR code, their details are logged
- **Geolocation**: Automatically captures location data (city, region, country) from IP addresses
- **Discord Notifications**: Receive instant notifications on Discord when your item is found
- **Email Alerts**: Send email notifications to your inbox when scans occur (SMTP configurable)
- **Admin Dashboard**: Access `/api/scans` with your admin token to view all scan logs
- **Privacy-Focused**: Minimal data collection, runs on your own server
- **Zero Dependencies UI**: Beautiful dark HTML interface, no JavaScript framework bloat

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/stoneset/tagd.git tagd
cd tagd
npm install
```

### 2. Configure Environment & App

**Setup environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3000
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
ADMIN_TOKEN=your-secure-token
```

### 3. Configure Items

Create `data/items.csv` to define which items should trigger notifications:

```csv
id,name
K001,Trousseau de clés
BP001,Sac à dos rouge
LAP001,Laptop Dell
```

Only scans from items in this CSV will trigger Discord/Email notifications. Other scans are logged but silently.

### 4. Create QR Codes

Generate QR codes pointing to:
```
https://your-domain.com/i/ITEM_ID
```

For example:
- `https://tagd.example.com/i/K001`
- `https://tagd.example.com/i/BP001`
- `https://tagd.example.com/i/LAP001`

Short IDs (3-4 chars) keep QR codes compact and easy to scan.

### 5. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:3000`

## Routes

### Public Routes

- **GET `/` - Homepage**
  Serves the public landing page with owner contact information.

- **GET `/i/:id` - Scan Logger**
  - Logs the scan with full details (IP, geolocation, user-agent, etc.)
  - **Sends Discord/Email notifications only if the item ID is in `data/items.csv`**
  - Serves the public page with owner contact info
  - No authentication required

### Admin Routes

- **GET `/api/scans` - Get Scans**
  Returns JSON array of logged scans with optional filtering.
  
  **Required Header:**
  ```
  x-admin-token: your-secure-token
  ```
  
  **Query Parameters:**
  - `itemId` - Filter by item ID (e.g., `?itemId=keys-001`)
  - `from` - Filter from date (ISO 8601, e.g., `?from=2024-01-01`)
  - `to` - Filter to date (ISO 8601, e.g., `?to=2024-12-31`)
  
  **Examples:**
  ```bash
  # Get all scans
  curl -H "x-admin-token: your-secure-token" http://localhost:3000/api/scans
  
  # Filter by item
  curl -H "x-admin-token: your-secure-token" http://localhost:3000/api/scans?itemId=keys-001
  
  # Filter by date range
  curl -H "x-admin-token: your-secure-token" http://localhost:3000/api/scans?from=2024-01-01&to=2024-12-31
  ```

- **GET `/api/export` - Export Scans**
  Export scans in CSV or JSON format with optional filtering.
  
  **Required Header:**
  ```
  x-admin-token: your-secure-token
  ```
  
  **Query Parameters:**
  - `format` - Export format: `csv` or `json` (default: `json`)
  - `itemId` - Filter by item ID
  - `from` - Filter from date (ISO 8601)
  - `to` - Filter to date (ISO 8601)
  
  **Examples:**
  ```bash
  # Export all scans as JSON
  curl -H "x-admin-token: your-secure-token" http://localhost:3000/api/export > scans.json
  
  # Export all scans as CSV
  curl -H "x-admin-token: your-secure-token" http://localhost:3000/api/export?format=csv > scans.csv
  
  # Export scans for specific item as CSV
  curl -H "x-admin-token: your-secure-token" http://localhost:3000/api/export?format=csv&itemId=keys-001 > keys.csv
  ```

## Logged Data Per Scan

Each scan records:
- **itemId** - The item identifier from the URL
- **ip** - Client IP address (x-forwarded-for aware)
- **userAgent** - Browser/device info
- **acceptLanguage** - Language preferences
- **referer** - HTTP referer
- **timestamp** - ISO 8601 timestamp
- **geo** - Location data (city, region, country)
- **headers** - All HTTP request headers

## Discord Notifications

When someone scans your QR code, you'll receive a Discord embed with:
- Item ID
- Visitor's IP address
- Location (city, region, country)
- Device info (user-agent)
- Scan timestamp
- Language preference

## Geolocation

The app automatically captures location data (city, region, country) for each scan using **ip-api.com**.

**ip-api.com:**
- Accuracy: Good (city-level)
- Setup: No configuration needed
- Limitations: 45 requests/minute rate limit

## Configuration

All personalization is done through `config.json` (created from `config.json.example`):

### Owner Information
```json
"owner": {
  "name": "Your Name",
  "email": "your-email@example.com",
  "website": "https://your-website.com"
}
```
These fields are displayed on the public page with contact buttons.

### Appearance Customization
```json
"appearance": {
  "primaryColor": "#6b7be5",
  "accentColor": "#5a6bc4"
}
```
Change colors to match your branding. The primary color is used for links, buttons, and highlights. The accent color is used for hover states.

### Supported Languages
```json
"locales": ["en", "fr"]
```
Add language codes to make those translation files available. Translations are loaded from `public/i18n/{lang}.json`.

### Rate Limiting
```json
"rateLimit": {
  "enabled": true,
  "windowMs": 900000,
  "maxRequests": 10
}
```
- **enabled**: Turn rate limiting on/off
- **windowMs**: Time window in milliseconds (default: 900000 = 15 minutes)
- **maxRequests**: Max requests per IP per window (default: 10)

Rate limiting is applied to the `/i/:id` endpoint to prevent abuse. When a visitor exceeds the limit, they get a 429 error.

### Email Notifications (SMTP)

You can send email notifications when someone scans your QR code. Configure in `config.json`:

```json
"smtp": {
  "enabled": false,
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "your-email@gmail.com",
  "pass": "your-app-password",
  "from": "your-email@gmail.com",
  "to": "admin@example.com"
}
```

**Configuration Fields:**
- **enabled**: Set to `true` to enable email notifications
- **host**: SMTP server hostname (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`, custom server)
- **port**: SMTP port (usually 587 for TLS or 465 for SSL)
- **secure**: Use SSL/TLS (false for 587, true for 465)
- **user**: SMTP authentication username
- **pass**: SMTP authentication password (use app-specific password for Gmail)
- **from**: Sender email address
- **to**: Recipient email address

**Gmail Setup:**
1. Enable 2-factor authentication on your Google account
2. Generate an app-specific password: https://myaccount.google.com/apppasswords
3. Use the 16-character password in the `pass` field

**Custom SMTP:**
Use your own mail server or third-party services like Mailgun, SendGrid, or Brevo with their SMTP credentials.

## Future Enhancements

- [ ] SQLite support for persistent storage
- [ ] Web UI for viewing scans
- [ ] Multiple admin users with roles
- [x] Email notifications
- [x] Data export (CSV, JSON)
- [ ] Map visualization of scan locations
