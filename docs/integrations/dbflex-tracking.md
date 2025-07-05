# dbFLEX Link Tracking Integration

## Overview

Salty can track when users access encrypted links generated from dbFLEX databases. This provides visibility into link access for compliance and confirmation purposes.

## Setup

### 1. Environment Configuration

Set the following environment variables on your Salty server:

```bash
DBFLEX_TRACKING_ENABLED=true
DBFLEX_API_KEY=your-bearer-token
DBFLEX_BASE_URL=https://pro.dbflex.net/secure/api/v2/15331
DBFLEX_TABLE_URL=PS%20Secure%20Share
DBFLEX_UPSERT_URL=upsert.json?match=%CE%B5%20Id
```

### 2. URL Generation

When generating Salty URLs from dbFLEX, include the record ID:

```
https://salty.esolia.pro/?payload=ENCRYPTED_DATA&id=20250105-001
```

The ID format must be: YYYYMMDD-NNN (e.g., 20250105-001)

### 3. dbFLEX Record Updates

When a user accesses the link, Salty will POST to your dbFLEX API:

```json
[
  {
    "§ Id": "SALTY-20250105-001",
    "Last Accessed": "2025-01-05T10:30:00Z",
    "Last User Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "Last User-Agent": "Browser: Chrome 120.0\nOS: macOS 10.15.7\nPlatform: Desktop",
    "Last Referrer": "https://source.com"
  }
]

Note: "Access Count" is not included in the payload - dbFLEX handles incrementing via trigger when the timestamp updates.
```

The "Access Count" field is managed by dbFLEX via trigger - when "Last Accessed" is updated, dbFLEX automatically increments the count. The "Has Been Accessed" status can be derived from whether "Last Accessed" is not null.

## Testing

1. Generate a test URL with an ID parameter
2. Access the URL in a browser
3. Check your dbFLEX record for updated access information

## Troubleshooting

- **No tracking occurring**: Check server logs for dbFLEX configuration warnings
- **API errors**: Verify API key and endpoint are correct
- **Invalid ID errors**: Ensure ID follows YYYYMMDD-NNN format

## Security

- IDs are validated to prevent injection
- Rate limiting prevents abuse
- Tracking failures don't affect decryption
- No sensitive data is logged