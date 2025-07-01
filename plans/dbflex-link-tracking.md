# dbFLEX Link Tracking Feature Plan

## Overview

This feature will enable tracking when users access Salty URLs that contain pre-populated encrypted payloads generated from the dbFLEX database. When a user clicks a link containing a unique record ID, Salty will send a POST request back to dbFLEX to update the record with access information.

## Use Case Flow

1. dbFLEX generates a shareable URL with:
   - Pre-populated encrypted payload (URL-encoded basE91 cipher)
   - Unique record ID (e.g., `SALTY-20250623-003`)
2. User clicks the shared link
3. Salty loads with the pre-populated payload
4. Salty detects the ID parameter and sends tracking data back to dbFLEX
5. dbFLEX record is updated with access timestamp and optional metadata

## Technical Implementation

### URL Structure

Current URL format:

```
https://salty.esolia.pro/en/?payload=ENCODED_CIPHER_TEXT
```

New URL format with tracking:

```
https://salty.esolia.pro/en/?payload=ENCODED_CIPHER_TEXT&id=20250623-003
```

Note: The ID parameter will contain only the numeric portion (20250623-003) without the "SALTY-" prefix for cleaner URLs.

### Server-Side Implementation

#### 1. Environment Configuration

New environment variables needed:

```
DBFLEX_API_URL=https://api.dbflex.net/v2/records/update
DBFLEX_API_KEY=your-api-key-here
DBFLEX_TABLE_ID=your-table-id
DBFLEX_TRACKING_ENABLED=true
```

#### 2. New Endpoint: `/api/track-access`

Create a new API endpoint that:

- Accepts POST requests from the client
- Validates the record ID format
- Sends update to dbFLEX
- Returns success/failure status

```typescript
// Example endpoint structure
async function trackAccess(request: Request): Promise<Response> {
  const { id, timestamp, userAgent, referrer } = await request.json();

  // Validate ID format (YYYYMMDD-NNN)
  if (!isValidRecordId(id)) {
    return new Response(JSON.stringify({ error: "Invalid ID format" }), {
      status: 400,
    });
  }

  // Send to dbFLEX
  const dbflexResponse = await fetch(DBFLEX_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DBFLEX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tableId: DBFLEX_TABLE_ID,
      recordId: `SALTY-${id}`,
      fields: {
        lastAccessed: timestamp,
        accessCount: { $inc: 1 },
        lastUserAgent: userAgent,
        lastReferrer: referrer || "direct",
      },
    }),
  });

  return new Response(JSON.stringify({
    success: dbflexResponse.ok,
  }));
}
```

#### 3. Server HTML Modification

Modify the server to inject tracking configuration into the HTML:

- Check if tracking is enabled
- Inject the tracking endpoint URL
- Ensure ID parameter is passed through

### Client-Side Implementation

#### 1. Parameter Detection

Add JavaScript to detect and extract the ID parameter:

```javascript
// Extract ID from URL parameters
function getTrackingId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}
```

#### 2. Tracking Request

Send tracking data when the page loads with an ID:

```javascript
async function trackLinkAccess() {
  const trackingId = getTrackingId();
  if (!trackingId) return;

  try {
    await fetch("/api/track-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: trackingId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      }),
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience
    console.debug("Tracking request failed:", error);
  }
}

// Call on page load
document.addEventListener("DOMContentLoaded", trackLinkAccess);
```

### Security Considerations

1. **Rate Limiting**: Apply rate limiting to the tracking endpoint to prevent abuse
2. **ID Validation**: Strictly validate ID format to prevent injection attacks
3. **Authentication**: Consider requiring the tracking endpoint to validate against known IDs
4. **CORS**: Ensure proper CORS headers if dbFLEX needs direct access
5. **Privacy**: Don't collect personally identifiable information without consent
6. **Fail Gracefully**: Tracking failures should not affect the user experience

### dbFLEX Integration Details

#### Required Information from dbFLEX:

1. **REST API Endpoint**: Full URL for record updates
2. **Authentication Method**: API key format and header name
3. **Table/Database ID**: Unique identifier for the target table
4. **Field Mappings**:
   - Field name for last accessed timestamp
   - Field name for access count
   - Field name for user agent (if desired)
   - Field name for referrer (if desired)
   - Any other metadata fields

#### Example dbFLEX Configuration:

```javascript
{
  endpoint: "https://api.dbflex.net/v2/records/update",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "X-Database-ID": "your-database-id"
  },
  payload: {
    table: "salty_shares",
    record: "SALTY-${id}",
    updates: {
      "last_accessed": "${timestamp}",
      "access_count": { "$increment": 1 },
      "last_user_agent": "${userAgent}",
      "last_referrer": "${referrer}"
    }
  }
}
```

### Implementation Phases

#### Phase 1: Basic Tracking (MVP)

- Add ID parameter support
- Create tracking endpoint
- Send basic timestamp on access
- Update single "last accessed" field

#### Phase 2: Enhanced Analytics

- Add access count increment
- Track user agent and referrer
- Add geographic location (server-side IP lookup)
- Track time spent on page

#### Phase 3: Advanced Features

- Track successful decryption attempts
- Add webhook notifications for access
- Generate access reports
- Add option to disable link after N accesses

### Testing Strategy

1. **Unit Tests**:
   - ID format validation
   - URL parameter extraction
   - API request formation

2. **Integration Tests**:
   - Mock dbFLEX API responses
   - Test rate limiting
   - Test error handling

3. **End-to-End Tests**:
   - Full flow from URL click to database update
   - Test with various ID formats
   - Test with missing/invalid IDs

### Rollback Plan

If issues arise:

1. Disable tracking via `DBFLEX_TRACKING_ENABLED=false`
2. The feature fails silently without affecting core functionality
3. Remove ID parameters from generated URLs in dbFLEX

### Monitoring

1. Add logging for:
   - Successful tracking requests
   - Failed dbFLEX API calls
   - Invalid ID attempts

2. Metrics to track:
   - Tracking request success rate
   - Average response time from dbFLEX
   - Number of unique IDs tracked

### Future Enhancements

1. **Batch Updates**: Queue tracking events and send in batches
2. **Offline Support**: Store tracking events locally and sync when online
3. **Analytics Dashboard**: Build reporting interface in dbFLEX
4. **Expiring Links**: Auto-disable links after time/access threshold
5. **Password Protection**: Require additional auth for tracked links

## Summary

This feature adds valuable analytics to the Salty + dbFLEX workflow while maintaining security and user privacy. The implementation is designed to fail gracefully and not interfere with the core encryption/decryption functionality.

The modular approach allows for incremental deployment and easy rollback if needed. Starting with basic timestamp tracking in Phase 1 provides immediate value while laying groundwork for more advanced features.
