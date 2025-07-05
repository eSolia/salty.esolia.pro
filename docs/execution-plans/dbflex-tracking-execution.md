# Execution Plan: dbFLEX Link Tracking

## Metadata

- **Source Pitch**: [dbflex-link-tracking.md](../pitches/dbflex-link-tracking.md)
- **Complexity**: Moderate (15-20 tasks)
- **Estimated Tasks**: 18
- **AI Execution Mode**: Zero-shot
- **Created**: 2025-01-05
- **Translator**: Claude (Translator Persona)

## Pre-Execution Checklist

- [x] Server.ts structure understood
- [x] API endpoint patterns identified
- [x] Client-side integration points clear
- [x] Environment variable patterns known
- [x] Security requirements defined
- [x] No blockers identified

## Execution Order

### Phase 1: Environment Setup (Tasks 1-3)
Environment variables and configuration validation

### Phase 2: Server API Implementation (Tasks 4-8)
Create the tracking endpoint with validation and rate limiting

### Phase 3: dbFLEX Integration (Tasks 9-11)
Implement the API client for dbFLEX communication

### Phase 4: Client-Side Implementation (Tasks 12-14)
Add tracking detection and beacon sending

### Phase 5: Testing (Tasks 15-17)
Unit and integration tests

### Phase 6: Documentation (Task 18)
Update relevant documentation

---

## Task Specifications

### Task #1: Add dbFLEX Environment Variables

**Type**: Modify
**File**: `server.ts`
**Dependencies**: None

**Context**:
Add new environment variables for dbFLEX integration following the existing pattern.

**Current State**:
```typescript
// Starting around line 50 in validateEnvironment()
function validateEnvironment(): void {
  const requiredVars = ["SALT_HEX"];
  // ... existing validation
```

**Implementation Steps**:
1. Add dbFLEX variables to optional environment checks
2. Log their presence/absence during startup
3. Add to logger initialization if tracking is enabled

**Code Changes**:
```typescript
// After existing environment checks in validateEnvironment()
// Add around line 70-80
const dbflexTracking = Deno.env.get("DBFLEX_TRACKING_ENABLED") === "true";
if (dbflexTracking) {
  const dbflexVars = ["DBFLEX_API_KEY", "DBFLEX_BASE_URL", "DBFLEX_TABLE_URL", "DBFLEX_UPSERT_URL"];
  const missingDbflex = dbflexVars.filter(v => !Deno.env.get(v));
  if (missingDbflex.length > 0) {
    logger.warn(`dbFLEX tracking enabled but missing: ${missingDbflex.join(", ")}`);
  } else {
    logger.info("dbFLEX tracking configured and enabled");
  }
}
```

**Success Criteria**:
- Server logs dbFLEX configuration status on startup
- Missing variables produce warnings but don't crash server
- Configuration follows existing pattern

---

### Task #2: Create ID Validation Function

**Type**: Create
**File**: `server.ts`
**Dependencies**: None

**Context**:
Need to validate the dbFLEX ID format (YYYYMMDD-NNN) for security.

**Current State**:
File exists but no ID validation function.

**Implementation Steps**:
1. Add validation function after existing utility functions
2. Use regex pattern for YYYYMMDD-NNN format
3. Include basic date validation

**Code Pattern**:
```typescript
// Add after SecurityUtils class, around line 200
function isValidDbflexId(id: string): boolean {
  // Format: YYYYMMDD-NNN where NNN is 3 digits
  const pattern = /^(\d{4})(\d{2})(\d{2})-(\d{3})$/;
  const match = id.match(pattern);
  
  if (!match) return false;
  
  // Basic date validation
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const day = parseInt(match[3]);
  
  if (year < 2020 || year > 2030) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  return true;
}
```

**Success Criteria**:
- Function validates correct format
- Rejects invalid dates
- Returns boolean

---

### Task #3: Add Tracking Configuration Type

**Type**: Modify
**File**: `server.ts`
**Dependencies**: None

**Context**:
Define TypeScript interface for dbFLEX configuration.

**Current State**:
Various interfaces exist around line 30-40.

**Implementation Steps**:
1. Add interface near other type definitions
2. Include all necessary configuration fields

**Code Pattern**:
```typescript
// Add after existing interfaces, around line 40
interface DbflexConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  tableUrl?: string;
  upsertUrl?: string;
}

// Add function to get config
function getDbflexConfig(): DbflexConfig {
  return {
    enabled: Deno.env.get("DBFLEX_TRACKING_ENABLED") === "true",
    apiKey: Deno.env.get("DBFLEX_API_KEY"),
    baseUrl: Deno.env.get("DBFLEX_BASE_URL"),
    tableUrl: Deno.env.get("DBFLEX_TABLE_URL"),
    upsertUrl: Deno.env.get("DBFLEX_UPSERT_URL"),
  };
}
```

**Success Criteria**:
- Type-safe configuration access
- Easy to check if tracking is enabled

---

### Task #4: Create Track Access API Handler

**Type**: Modify
**File**: `server.ts`
**Dependencies**: [Task #2, Task #3]

**Context**:
Add new API endpoint handler following existing patterns.

**Current State**:
API handlers start around line 400 with handleApiRequest function.

**Implementation Steps**:
1. Add new case in handleApiRequest switch statement
2. Create dedicated handler function
3. Include rate limiting and validation

**Code Pattern**:
```typescript
// In handleApiRequest function, add case around line 450
case "/api/track-access":
  return await handleTrackAccess(req);

// Add new handler function after other handlers, around line 600
async function handleTrackAccess(req: Request): Promise<Response> {
  const dbflexConfig = getDbflexConfig();
  
  if (!dbflexConfig.enabled) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Tracking not enabled" 
    }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const data = await req.json();
    const { id, timestamp, userAgent, referrer } = data;

    // Validate ID format
    if (!id || !isValidDbflexId(id)) {
      throw new ApiError("Invalid ID format", 400, "INVALID_ID");
    }

    // Forward to dbFLEX (next task)
    const result = await forwardToDbflex(id, timestamp, userAgent, referrer);
    
    return new Response(JSON.stringify({ 
      success: result.success,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Track access error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: error.statusCode || 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

**Success Criteria**:
- Endpoint responds to POST /api/track-access
- Validates input data
- Returns standardized response format

---

### Task #5: Apply Rate Limiting to Track Endpoint

**Type**: Modify
**File**: `server.ts`
**Dependencies**: [Task #4]

**Context**:
Add rate limiting to prevent abuse of tracking endpoint.

**Current State**:
Rate limiter is configured around line 350 in handleRequest.

**Implementation Steps**:
1. Add /api/track-access to rate-limited paths
2. Use same rate limit as other API endpoints

**Code Pattern**:
```typescript
// In handleRequest function, around line 360
if (pathname.startsWith("/api/") && pathname !== "/api/csp-report") {
  // This already includes /api/track-access
  const rateLimitResponse = await rateLimiter.checkLimit(clientIp);
  // ... existing code
}
```

**Success Criteria**:
- Track endpoint is rate limited
- Same limits as other API endpoints
- Returns 429 when limit exceeded

---

### Task #6: Add CORS Headers for Track Endpoint

**Type**: Modify  
**File**: `server.ts`
**Dependencies**: [Task #4]

**Context**:
Ensure CORS headers are properly set for the tracking endpoint.

**Current State**:
CORS headers are set in handleApiRequest function.

**Implementation Steps**:
1. Verify CORS headers are applied to track endpoint
2. No changes needed if using handleApiRequest pattern

**Code Pattern**:
```typescript
// In handleApiRequest, headers are already set around line 420
response.headers.set("Access-Control-Allow-Origin", "*");
response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
// Already applies to all API endpoints
```

**Success Criteria**:
- Track endpoint includes CORS headers
- OPTIONS requests handled properly

---

### Task #7: Create dbFLEX API Client Function

**Type**: Modify
**File**: `server.ts`
**Dependencies**: [Task #3]

**Context**:
Implement the function that communicates with dbFLEX API.

**Current State**:
No dbFLEX integration exists yet.

**Implementation Steps**:
1. Create function to format and send requests to dbFLEX
2. Parse user agent for human-readable format
3. Handle authentication and error cases
4. Log results for monitoring

**Code Pattern**:
```typescript
// Add helper function to parse user agent, around line 640
function parseUserAgent(userAgent: string): string {
  // Basic parsing - can be enhanced with a proper UA parser library
  const lines: string[] = [];
  
  // Try to extract browser
  const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
  const safariMatch = userAgent.match(/Safari\/([\d.]+)/);
  const firefoxMatch = userAgent.match(/Firefox\/([\d.]+)/);
  
  if (chromeMatch) lines.push(`Browser: Chrome ${chromeMatch[1]}`);
  else if (firefoxMatch) lines.push(`Browser: Firefox ${firefoxMatch[1]}`);
  else if (safariMatch) lines.push(`Browser: Safari ${safariMatch[1]}`);
  
  // Extract OS
  if (userAgent.includes("Windows NT")) lines.push("OS: Windows");
  else if (userAgent.includes("Mac OS X")) {
    const osMatch = userAgent.match(/Mac OS X ([\d_]+)/);
    if (osMatch) lines.push(`OS: macOS ${osMatch[1].replace(/_/g, '.')}`);
  }
  else if (userAgent.includes("Linux")) lines.push("OS: Linux");
  else if (userAgent.includes("Android")) lines.push("OS: Android");
  else if (userAgent.includes("iOS")) lines.push("OS: iOS");
  
  // Platform
  if (userAgent.includes("Mobile")) lines.push("Platform: Mobile");
  else lines.push("Platform: Desktop");
  
  return lines.join("\n");
}

// Add after handleTrackAccess function, around line 670
async function forwardToDbflex(
  id: string, 
  timestamp: string, 
  userAgent: string, 
  referrer: string
): Promise<{ success: boolean }> {
  const config = getDbflexConfig();
  
  if (!config.baseUrl || !config.apiKey || !config.tableUrl || !config.upsertUrl) {
    logger.error("dbFLEX configuration incomplete");
    return { success: false };
  }

  try {
    // Construct the full URL
    const url = `${config.baseUrl}/${config.tableUrl}/${config.upsertUrl}`;
    
    // Reconstruct the full ID with SALTY- prefix
    const reconstructedId = `SALTY-${id}`;
    
    // Parse user agent for human-readable format
    const parsedUserAgent = parseUserAgent(userAgent || "unknown");
    
    // Prepare payload - dbFLEX will handle access count via trigger
    const payload = [{
      "§ Id": reconstructedId,
      "Last Accessed": timestamp,
      "Last User Agent": userAgent || "unknown",
      "Last User-Agent": parsedUserAgent,
      "Last Referrer": referrer || "direct"
    }];

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`dbFLEX API error: ${response.status} ${response.statusText} - ${errorText}`);
      return { success: false };
    }

    logger.info(`Successfully tracked access for ID: ${reconstructedId}`);
    return { success: true };
  } catch (error) {
    logger.error("dbFLEX API request failed:", error);
    return { success: false };
  }
}
```

**Success Criteria**:
- Sends proper POST request to dbFLEX
- Includes authentication header
- Handles errors gracefully
- Logs success/failure

---

### Task #8: Add Telemetry for Tracking

**Type**: Modify
**File**: `server.ts`
**Dependencies**: [Task #4, Task #7]

**Context**:
Add telemetry spans for tracking operations to monitor performance.

**Current State**:
Telemetry is used throughout for performance monitoring.

**Implementation Steps**:
1. Add telemetry span in handleTrackAccess
2. Track dbFLEX API call duration

**Code Pattern**:
```typescript
// In handleTrackAccess function, wrap the main logic
async function handleTrackAccess(req: Request): Promise<Response> {
  return telemetry.trackSpan("track-access", async () => {
    // ... existing handleTrackAccess code ...
    
    // When calling dbFLEX
    const result = await telemetry.trackSpan("dbflex-api-call", async () => {
      return await forwardToDbflex(id, timestamp, userAgent, referrer);
    });
    
    // ... rest of function
  });
}
```

**Success Criteria**:
- Tracking operations appear in telemetry
- Performance metrics available
- Follows existing telemetry patterns

---

### Task #9: Create Client-Side Tracking Detection

**Type**: Modify
**File**: `index.html`
**Dependencies**: None

**Context**:
Add JavaScript to detect ID parameter and send tracking beacon.

**Current State**:
Main script tag starts around line 600.

**Implementation Steps**:
1. Add function to extract ID from URL
2. Add function to send tracking request
3. Call on page load

**Code Pattern**:
```javascript
// Add in the main script tag, after existing initialization code
// Around line 650, after DOMContentLoaded listener setup

// Extract tracking ID from URL
function getTrackingId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// Send tracking beacon to server
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

// Add to DOMContentLoaded handler
document.addEventListener("DOMContentLoaded", function() {
  // ... existing code ...
  
  // Track access if ID present
  trackLinkAccess();
});
```

**Success Criteria**:
- Detects ?id= parameter in URL
- Sends POST to /api/track-access
- Fails silently on error
- Non-blocking execution

---

### Task #10: Add Tracking to English Version

**Type**: Modify
**File**: `en/index.html`
**Dependencies**: [Task #9]

**Context**:
Ensure English version also has tracking functionality.

**Current State**:
English version mirrors Japanese version structure.

**Implementation Steps**:
1. Add same tracking functions to English version
2. Ensure consistent implementation

**Code Pattern**:
```javascript
// Add the same tracking code from Task #9 to en/index.html
// In the main script tag, around line 650
// Exact same implementation as Japanese version
```

**Success Criteria**:
- English version tracks access
- Same functionality as Japanese version

---

### Task #11: Add Client-Side URL Parameter Preservation

**Type**: Modify
**File**: `index.html`
**Dependencies**: [Task #9]

**Context**:
Ensure ID parameter is preserved when switching languages.

**Current State**:
Language switch link around line 480.

**Implementation Steps**:
1. Modify language switch to preserve URL parameters
2. Apply to both language versions

**Code Pattern**:
```javascript
// In the script section, add function to update language links
function preserveUrlParameters() {
  const params = window.location.search;
  if (params) {
    // Update language switch links
    const langLinks = document.querySelectorAll('a[href="en/"], a[href="../"]');
    langLinks.forEach(link => {
      const href = link.getAttribute('href');
      link.setAttribute('href', href + params);
    });
  }
}

// Call in DOMContentLoaded
document.addEventListener("DOMContentLoaded", function() {
  // ... existing code ...
  preserveUrlParameters();
});
```

**Success Criteria**:
- Language switch preserves ?id= parameter
- Works in both directions (JP ↔ EN)

---

### Task #12: Create Basic Integration Test

**Type**: Create
**File**: `server_test.ts`
**Dependencies**: [Task #4]

**Context**:
Add tests for the tracking endpoint.

**Current State**:
Test file exists with various endpoint tests.

**Implementation Steps**:
1. Add test for valid tracking request
2. Add test for invalid ID format
3. Add test for disabled tracking

**Code Pattern**:
```typescript
// Add new test group around line 300
Deno.test("Track Access API Tests", async (t) => {
  await t.step("should accept valid tracking request", async () => {
    const request = new Request("http://localhost/api/track-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "20250105-001",
        timestamp: new Date().toISOString(),
        userAgent: "Test Agent",
        referrer: "https://example.com",
      }),
    });

    // Mock dbFLEX config
    Deno.env.set("DBFLEX_TRACKING_ENABLED", "true");
    Deno.env.set("DBFLEX_API_URL", "https://api.test.com");
    Deno.env.set("DBFLEX_API_KEY", "test-key");
    Deno.env.set("DBFLEX_TABLE_ID", "test-table");

    const response = await handleRequest(request);
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.success, true);
  });

  await t.step("should reject invalid ID format", async () => {
    const request = new Request("http://localhost/api/track-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "invalid-format",
        timestamp: new Date().toISOString(),
      }),
    });

    const response = await handleRequest(request);
    assertEquals(response.status, 400);
  });
});
```

**Success Criteria**:
- Tests pass for valid requests
- Tests fail appropriately for invalid input
- Follows existing test patterns

---

### Task #13: Add ID Validation Tests

**Type**: Modify
**File**: `server_test.ts`
**Dependencies**: [Task #2, Task #12]

**Context**:
Test the ID validation function specifically.

**Current State**:
Test file has various utility function tests.

**Implementation Steps**:
1. Add dedicated tests for isValidDbflexId function
2. Test edge cases and invalid formats

**Code Pattern**:
```typescript
// Add after utility function tests, around line 200
Deno.test("dbFLEX ID Validation", async (t) => {
  await t.step("should accept valid ID formats", () => {
    assertEquals(isValidDbflexId("20250105-001"), true);
    assertEquals(isValidDbflexId("20231231-999"), true);
    assertEquals(isValidDbflexId("20201001-000"), true);
  });

  await t.step("should reject invalid formats", () => {
    assertEquals(isValidDbflexId("2025-01-05-001"), false);
    assertEquals(isValidDbflexId("20250105001"), false);
    assertEquals(isValidDbflexId("SALTY-20250105-001"), false);
    assertEquals(isValidDbflexId("20250105-1"), false);
    assertEquals(isValidDbflexId("20250105-9999"), false);
  });

  await t.step("should reject invalid dates", () => {
    assertEquals(isValidDbflexId("20191231-001"), false); // Too old
    assertEquals(isValidDbflexId("20311231-001"), false); // Too future
    assertEquals(isValidDbflexId("20250001-001"), false); // Invalid month
    assertEquals(isValidDbflexId("20251301-001"), false); // Invalid month
    assertEquals(isValidDbflexId("20250132-001"), false); // Invalid day
  });
});
```

**Success Criteria**:
- Validation function properly tested
- Edge cases covered
- All tests pass

---

### Task #14: Create Mock dbFLEX Response Test

**Type**: Modify
**File**: `server_test.ts`
**Dependencies**: [Task #7, Task #12]

**Context**:
Test dbFLEX API integration with mocked responses.

**Current State**:
Various API tests exist with mocking patterns.

**Implementation Steps**:
1. Mock fetch for dbFLEX API calls
2. Test success and failure scenarios

**Code Pattern**:
```typescript
// Add to track access tests
await t.step("should handle dbFLEX API success", async () => {
  // Mock global fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    if (url.toString().includes("api.test.com")) {
      return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(url, init);
  };

  try {
    const request = new Request("http://localhost/api/track-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "20250105-001",
        timestamp: new Date().toISOString(),
        userAgent: "Test",
        referrer: "test",
      }),
    });

    const response = await handleRequest(request);
    assertEquals(response.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

**Success Criteria**:
- dbFLEX calls are properly mocked
- Success and failure cases tested
- No actual external API calls made

---

### Task #15: Add Security Test for Tracking

**Type**: Modify
**File**: `salty_security_test.ts`
**Dependencies**: [Task #4]

**Context**:
Ensure tracking endpoint follows security best practices.

**Current State**:
Security tests exist for other endpoints.

**Implementation Steps**:
1. Add test for rate limiting on track endpoint
2. Add test for CORS headers
3. Add test for input validation

**Code Pattern**:
```typescript
// Add to API security tests section
Deno.test("Track Access Security", async (t) => {
  await t.step("should rate limit tracking endpoint", async () => {
    // Enable tracking
    Deno.env.set("DBFLEX_TRACKING_ENABLED", "true");
    
    const makeRequest = () => new Request("http://localhost/api/track-access", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": "192.168.1.100",
      },
      body: JSON.stringify({
        id: "20250105-001",
        timestamp: new Date().toISOString(),
      }),
    });

    // Make requests up to rate limit
    for (let i = 0; i < 20; i++) {
      const response = await handleRequest(makeRequest());
      assert(response.status < 429);
    }

    // Next request should be rate limited
    const response = await handleRequest(makeRequest());
    assertEquals(response.status, 429);
  });

  await t.step("should validate content type", async () => {
    const request = new Request("http://localhost/api/track-access", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });

    const response = await handleRequest(request);
    assertEquals(response.status, 400);
  });
});
```

**Success Criteria**:
- Rate limiting works on track endpoint
- Invalid input rejected
- Security headers present

---

### Task #16: Update README with Tracking Feature

**Type**: Modify
**File**: `README.md`
**Dependencies**: None

**Context**:
Document the new tracking feature in the README.

**Current State**:
README has sections for features and environment variables.

**Implementation Steps**:
1. Add tracking to features list
2. Document new environment variables
3. Add integration section

**Code Pattern**:
```markdown
// In Features section, add:
- **dbFLEX Integration**: Optional link tracking for database-generated URLs

// In Environment Variables section, add:
### dbFLEX Integration (Optional)

- `DBFLEX_TRACKING_ENABLED`: Set to "true" to enable link tracking
- `DBFLEX_API_KEY`: Bearer token for dbFLEX authentication
- `DBFLEX_BASE_URL`: Base URL for dbFLEX API (e.g., https://pro.dbflex.net/secure/api/v2/15331)
- `DBFLEX_TABLE_URL`: URL-encoded table name (e.g., PS%20Secure%20Share)
- `DBFLEX_UPSERT_URL`: Upsert endpoint with match parameter (e.g., upsert.json?match=%CE%B5%20Id)

When enabled, Salty will track access to URLs containing `?id=` parameters and update the corresponding records in dbFLEX.
```

**Success Criteria**:
- Feature documented
- Environment variables explained
- Integration purpose clear

---

### Task #17: Update SECURITY.md Changelog

**Type**: Modify
**File**: `SECURITY.md`
**Dependencies**: None

**Context**:
Document security considerations of the tracking feature.

**Current State**:
Security changelog exists in SECURITY.md.

**Implementation Steps**:
1. Add entry to security changelog
2. Document security measures taken

**Code Pattern**:
```markdown
// In Security Changelog section, add new entry:

### 2025-01-05 - dbFLEX Link Tracking Integration

**Feature**: Added optional link tracking for dbFLEX-generated URLs

**Security Measures**:
- Input validation: Strict ID format validation (YYYYMMDD-NNN)
- Rate limiting: Applied to /api/track-access endpoint
- Authentication: Requires valid API key for dbFLEX communication
- Fail-safe: Tracking failures don't affect core functionality
- No data storage: All tracking data forwarded to dbFLEX only
- CORS configured for API endpoint

**InfoSec**: Maintains zero-knowledge architecture, no sensitive data logged
```

**Success Criteria**:
- Security implications documented
- Measures taken are clear
- Follows changelog format

---

### Task #18: Create Integration Documentation

**Type**: Create
**File**: `docs/integrations/dbflex-tracking.md`
**Dependencies**: None

**Context**:
Create detailed integration guide for dbFLEX users.

**Current State**:
New file to be created.

**Implementation Steps**:
1. Create integrations directory
2. Write comprehensive setup guide
3. Include examples and troubleshooting

**Code Pattern**:
```markdown
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
```

**Success Criteria**:
- Complete setup instructions
- Clear examples
- Troubleshooting guidance

---

## Integration Points

### Component Integration Map

```
URL Parameter (?id=)
    ↓
Client Detection (Task #9-10)
    ↓
Track API Call (Task #9)
    ↓
Server Validation (Task #2,4)
    ↓
Rate Limiting (Task #5)
    ↓
dbFLEX Forward (Task #7)
    ↓
Record Update
```

### Shared Dependencies

- Environment validation: `validateEnvironment()`
- Logger instance: `logger`
- Rate limiter: Applied to all API routes
- Security headers: `SecurityUtils.createSecurityHeaders()`

---

## Testing Strategy

### Unit Tests
- ID format validation (Task #13)
- API endpoint logic (Task #12)
- Security measures (Task #15)

### Integration Tests
- Full tracking flow with mocked dbFLEX (Task #14)
- Rate limiting behavior (Task #15)
- Error handling scenarios

### Manual Testing
1. Set environment variables
2. Access URL with ?id=20250105-001
3. Check server logs for tracking
4. Verify no user-facing changes

---

## Error Handling

### Expected Edge Cases

1. **Missing configuration**: Log warning, disable tracking
2. **Invalid ID format**: Return 400, don't track
3. **dbFLEX API down**: Log error, return success to client
4. **Rate limit exceeded**: Return 429 error

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-01-05T10:00:00Z"
}
```

---

## Rollback Plan

If issues arise:

1. Set `DBFLEX_TRACKING_ENABLED=false`
2. Restart server
3. Feature automatically disabled
4. No code changes needed

---

## Success Validation

After execution, verify:

- [ ] Environment variables detected on startup
- [ ] /api/track-access endpoint responds
- [ ] Valid IDs trigger dbFLEX calls
- [ ] Invalid IDs are rejected
- [ ] Rate limiting works
- [ ] Language switch preserves ID
- [ ] All tests pass
- [ ] Documentation complete

---

## Notes for AI Executor

- Start with Task #1 and proceed sequentially
- Tasks 1-8 are server-side, 9-11 are client-side
- Use existing patterns from codebase
- Test as you go with simple curl commands
- If blocked, check environment variables first
- Success means invisible tracking with zero user impact