# dbFLEX Link Tracking Integration

## Overview

Salty can track when users access encrypted links generated from dbFLEX databases. This provides visibility into link access for compliance and confirmation purposes.

## Architecture

Due to SSL/TLS compatibility issues between Deno and dbFLEX's IIS server, the integration uses a Cloudflare Worker as a proxy:

```
Browser → Salty Server → Cloudflare Worker → dbFLEX API
```

## Setup

### 1. Cloudflare Worker Setup

1. Create a Cloudflare Worker with the proxy code (see `cloudflare-worker-proxy.js`)
2. Configure Worker environment variables:
   - `DBFLEX_URL`: Your dbFLEX API endpoint (e.g., `https://pro.dbflex.net/secure/api/v2/15331/PS%20Secure%20Share/update.json`)
   - `DBFLEX_API_KEY`: Your dbFLEX Bearer token (set as Secret)
   - `PROXY_SECRET`: A shared secret for authentication (set as Secret)

### 2. Salty Environment Configuration

Set the following environment variables on your Salty server (Deno Deploy):

```bash
DBFLEX_TRACKING_ENABLED=true
DBFLEX_BASE_URL=https://your-worker-name.workers.dev
DBFLEX_PROXY_SECRET=same-secret-as-cloudflare
```

Note: When using the proxy, you don't need `DBFLEX_TABLE_URL` or `DBFLEX_UPSERT_URL`.

### 3. dbFLEX Column Configuration

Create these columns in your dbFLEX table:

| Column Name     | Type            | Size/Format | Purpose                                       |
| --------------- | --------------- | ----------- | --------------------------------------------- |
| § Id            | Text            | Primary Key | Record identifier (SALTY-YYYYMMDD-NNN)        |
| Last Accessed   | DateTime        | ISO 8601    | Timestamp of last access                      |
| Access Count    | Integer         | N/A         | Number of accesses (use trigger to increment) |
| Last User Agent | Text            | 1000 chars  | Raw user agent string                         |
| Last User-Agent | Multi-line Text | Variable    | Parsed user agent (human-readable)            |
| Last Referrer   | Text            | 500 chars   | Source URL or "direct"                        |

### 4. URL Generation

When generating Salty URLs from dbFLEX, include the record ID:

```
https://salty.esolia.pro/?payload=ENCRYPTED_DATA&id=20250623-003
```

The ID format must be: YYYYMMDD-NNN (e.g., 20250623-003)

### 5. dbFLEX Record Updates

When a user accesses the link, the Worker sends this payload to dbFLEX:

```json
[
  {
    "§ Id": "SALTY-20250623-003",
    "Last Accessed": "2025-01-05T10:30:00Z",
    "Last User Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "Last User-Agent": "Browser: Chrome 137.0.0.0\nOS: macOS 10.15.7\nPlatform: Desktop",
    "Last Referrer": "https://source.com"
  }
]
```

**Note**: Configure a dbFLEX trigger to increment "Access Count" when "Last Accessed" is updated.

## Testing

1. Generate a test URL with an ID parameter (e.g., `?id=20250623-003`)
2. Access the URL in a browser
3. Check:
   - Cloudflare Worker logs for forwarding confirmation
   - Salty logs for successful tracking
   - dbFLEX record for updated access information

## Troubleshooting

### Common Issues

1. **"Configuration incomplete" error**
   - Ensure `DBFLEX_TRACKING_ENABLED=true`
   - Verify `DBFLEX_BASE_URL` is set to your Worker URL
   - Check `DBFLEX_PROXY_SECRET` matches Worker configuration

2. **403 Forbidden from Worker**
   - Verify `PROXY_SECRET` matches on both sides
   - Check Worker logs for authentication errors

3. **SSL/TLS errors (if not using proxy)**
   - This is why the proxy exists - Deno cannot connect directly to dbFLEX
   - Use the Cloudflare Worker proxy approach

4. **"Column is not accessible" error**
   - Verify API key has write permissions for all columns
   - Check if using correct endpoint (`update.json` not `upsert.json`)
   - Ensure column names match exactly (including special characters)

## Security

- IDs are validated to prevent injection (YYYYMMDD-NNN format)
- Rate limiting prevents abuse (20 requests/hour)
- Shared secret authentication between Salty and Worker
- API key stored securely in Cloudflare Worker
- Tracking failures don't affect core functionality
- No sensitive data is logged

## Architecture Decision Records

### ADR-001: Cloudflare Worker Proxy

**Context**: Deno's strict SSL/TLS requirements prevent direct connection to dbFLEX's IIS server

**Decision**: Implement a Cloudflare Worker as a proxy layer

**Consequences**:

- ✅ Overcomes SSL compatibility issues
- ✅ Keeps API key secure (not in Salty)
- ❌ Adds external dependency
- ❌ Slight latency increase

## API Flow Diagram

```
1. Browser detects ?id=20250623-003
   ↓
2. JavaScript sends POST to /api/track-access
   {
     "id": "20250623-003",
     "timestamp": "2025-01-05T10:30:00Z",
     "userAgent": "Mozilla/5.0...",
     "referrer": "https://source.com"
   }
   ↓
3. Salty validates ID format
   ↓
4. Salty sends to Cloudflare Worker with X-Proxy-Secret header
   ↓
5. Worker validates secret and forwards to dbFLEX
   ↓
6. dbFLEX updates record
   ↓
7. Success response flows back
```
