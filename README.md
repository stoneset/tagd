# tagd

Self-hosted lost-item tags. Stick a QR code on your stuff: whoever finds it lands on a page with your contact info, and you get a Discord and/or email notification with the approximate location of the scan.

- Server-rendered page (no client JavaScript), in the finder's browser language (English and French included)
- Discord webhook and SMTP email notifications
- Approximate geolocation of scans via ip-api.com
- Scan log with a small admin API (JSON / CSV export)
- No database: a CSV of your items and a JSON Lines log

## Requirements

Node.js 20.12 or later.

## Setup

```bash
git clone https://github.com/stoneset/tagd.git && cd tagd
npm install
cp .env.example .env                       # secrets: ADMIN_TOKEN (required), Discord webhook, SMTP password
cp config.json.example config.json         # owner info, colors, rate limit, SMTP server
cp data/items.csv.example data/items.csv   # your items
npm start                                  # or: npm run dev (restarts on code changes)
```

The app refuses to start without `config.json` or with an empty/default `ADMIN_TOKEN` (`openssl rand -hex 32` makes a good one).

### Items and QR codes

`data/items.csv` lists the tags that trigger notifications:

```csv
id,name,url
K001,Trousseau de clés,https://tagd.example.com/i/K001
BP001,Sac à dos rouge,https://tagd.example.com/i/BP001
```

- `id` and `name` are required. IDs are case-insensitive.
- Extra columns are ignored: the `url` column is there so label printing software can bind the QR code to the full URL rather than to the bare ID.
- `,` and `;` separators both work (Excel with a French locale saves with `;`).
- Restart the app after editing the file.

Each QR code points to `https://your-domain/i/<id>`. Tip: an all-uppercase URL (`HTTPS://TAGD.EXAMPLE.COM/I/K001`) lets the QR encoder use alphanumeric mode, which gives a smaller, easier to scan code on small labels.

Scans of IDs not listed in the CSV are recorded but don't trigger a notification.

## Configuration

**`.env`** (secrets and deployment):

| Variable | |
|---|---|
| `ADMIN_TOKEN` | Required. Protects the admin API. |
| `PORT` | Default `3000`. |
| `TRUST_PROXY` | Express [`trust proxy`](https://expressjs.com/en/guide/behind-proxies.html) setting, used to read the visitor's real IP. `loopback` (default) for nginx/Caddy on the same machine, `2` for Cloudflare → nginx → tagd. Wrong value = wrong IPs in your logs. |
| `DISCORD_WEBHOOK_URL` | Optional. |
| `SMTP_PASS` | SMTP password, if email notifications are enabled. |
| `DEBUG` | `true` for verbose logs. |

**`config.json`**:

- `owner`: `name`, `email`, `website` shown on the page (each one is optional, missing ones are hidden).
- `appearance`: `primaryColor`, `accentColor`.
- `rateLimit`: `windowMs`, `maxRequests`. The page is always served; the limit applies to recorded scans per IP (`maxRequests` per window), and notifications are sent at most once per item and IP per window.
- `smtp`: `enabled`, `host`, `port`, `secure` (`true` for port 465), `user`, `from`, `to`.

Translations live in `locales/<lang>.json`; adding a file adds a language.

## Admin API

All admin routes require the `x-admin-token` header.

`GET /api/scans` (alias `/api/export`), optional query parameters:

- `itemId`: filter on one item
- `from`, `to`: ISO 8601 dates; a bare date for `to` (`2026-12-31`) includes the whole day
- `format=csv`: CSV download instead of JSON

```bash
curl -H "x-admin-token: $TOKEN" "https://tagd.example.com/api/scans?itemId=K001&from=2026-01-01"
curl -H "x-admin-token: $TOKEN" "https://tagd.example.com/api/scans?format=csv" -o scans.csv
```

## Data and privacy

Each scan stores: timestamp, item ID and name, IP address, approximate location (city, region, country), user agent, `Accept-Language` and referer. Scans are appended to `data/scans.jsonl`, one JSON object per line.

IP addresses are personal data (GDPR): keep the log only as long as you need it.

Geolocation uses the free ip-api.com endpoint: plain HTTP only, 45 requests per minute, non-commercial use only. Private and local IPs are not looked up.

## License

MIT
