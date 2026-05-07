# tagd 🏷️

A self-hosted QR code scan logger with Discord notifications. Perfect for tracking found items, personal belongings, or inventory.

## Features

- **QR Code Scanning**: When someone scans a QR code, their details are logged
- **Geolocation**: Automatically captures location data (city, region, country) from IP addresses
- **Discord Notifications**: Receive instant notifications on Discord when your item is found
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

# Optional: MaxMind GeoIP2 for better geolocation accuracy
MAXMIND_ACCOUNT_ID=your-account-id
MAXMIND_LICENSE_KEY=your-license-key
```

**MaxMind Setup (Optional but Recommended):**
1. Create an account at [maxmind.com](https://www.maxmind.com/en/account)
2. Get your **Account ID** and **License Key** from the account settings
3. Add them to `.env` above
4. If not provided, the app falls back to **ip-api.com** (free, no key required)

### 3. Create QR Codes

Generate QR codes pointing to:
```
https://your-domain.com/itm/your-item-id
```

For example:
- `https://tagd.example.com/itm/keys-001`
- `https://tagd.example.com/itm/backpack-red`
- `https://tagd.example.com/itm/laptop-serial`

### 4. Run the Server

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

- **GET `/itm/:id` - Scan Logger**
  - Logs the scan with full details (IP, geolocation, user-agent, headers, etc.)
  - Sends Discord notification
  - Serves the public page with owner contact info
  - No authentication required

### Admin Routes

- **GET `/api/scans` - Get All Scans**
  Returns JSON array of all logged scans.
  
  **Required Header:**
  ```
  x-admin-token: your-secure-token
  ```
  
  **Example:**
  ```bash
  curl -H "x-admin-token: your-secure-token" http://localhost:3000/api/scans
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
- **headers** - All HTTP request headers (raw)

## Discord Notifications

When someone scans your QR code, you'll receive a Discord embed with:
- Item ID
- Visitor's IP address
- Location (city, region, country)
- Device info (user-agent)
- Scan timestamp
- Language preference

## Geolocation

The app automatically captures location data (city, region, country) for each scan.

### Geolocation Providers

**MaxMind GeoIP2 :**
- Accuracy: Very high (city-level)
- Setup: Requires API credentials
- Configuration: Set `MAXMIND_ACCOUNT_ID` and `MAXMIND_LICENSE_KEY` in `.env`

**ip-api.com (Fallback):**
- Accuracy: Good (city-level)
- Setup: No configuration needed
- Limitations: 45 requests/minute rate limit
- Auto-used: If MaxMind credentials not provided

The app will automatically use MaxMind if credentials are present, otherwise falls back to ip-api.com.

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

Rate limiting is applied to the `/itm/:id` endpoint to prevent abuse. When a visitor exceeds the limit, they get a 429 error.

## Future Enhancements

- [ ] SQLite support for persistent storage
- [ ] Web UI for viewing scans
- [ ] Multiple admin users with roles
- [ ] Email notifications
- [ ] Data export (CSV, JSON)
- [ ] Map visualization of scan locations
