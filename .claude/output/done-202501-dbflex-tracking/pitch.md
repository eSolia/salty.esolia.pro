# dbFLEX Link Tracking Pitch

**Start Date**: January 2025\
**Completion Date**: January 2025\
**Status**: Done ✅

## 1. Problem

**The Problem**: Organizations using dbFLEX to share encrypted Salty links have no visibility into whether recipients actually accessed the shared information.

**When it happens**:

- HR shares encrypted salary information with an employee
- Legal shares confidential documents with external parties
- IT shares credentials with contractors
- Anyone needs confirmation that sensitive information was received

**Who it affects**:

- dbFLEX users who generate Salty links from their database
- Managers who need audit trails for compliance
- Senders who need delivery confirmation
- Security teams tracking access to sensitive data

**Current workaround**:

- Manual follow-up emails/calls asking "Did you get it?"
- No way to know if links are being accessed by intended recipients
- Creating separate tracking spreadsheets
- Using third-party link shorteners (security risk)

**Why now**: As organizations adopt Salty + dbFLEX for secure information sharing, they need basic analytics to close the loop on critical communications.

### Evidence

- dbFLEX users generate Salty URLs with format: `https://salty.esolia.pro/?payload=CIPHER&id=20250623-003`
- Common request: "How do I know if they opened the link?"
- Compliance requirements often mandate access logging
- Current workflow is "fire and forget" with no feedback

---

## 2. Appetite

⏱️ **Small Batch** (2 weeks)

This is a Small Batch project because:

- Clear API integration pattern with dbFLEX
- Minimal UI changes (tracking happens invisibly)
- Can deliver core value (timestamp tracking) without complex features
- Fails gracefully without affecting core Salty functionality

---

## 3. Solution

### Approach

When Salty loads with a dbFLEX ID parameter, automatically notify dbFLEX that the link was accessed. Start with basic timestamp tracking, keeping it simple and reliable.

### Elements

#### Breadboard

```
Places:     [Salty with ID]  →  [Server API]  →  [dbFLEX API]
               ↓                    ↓                ↓
Affordances: • Detect ID         • Validate      • Update record
             • Extract params    • Rate limit    • Return status
             • Send beacon      • Forward call

Flow:
1. User clicks dbFLEX-generated link with ?id=20250623-003
2. Salty page loads and detects ID parameter
3. Client sends tracking beacon to Salty server
4. Server validates and forwards to dbFLEX API
5. dbFLEX record updated with access timestamp
```

#### Server Integration Sketch

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Salty Client  │      │   Salty Server  │      │   dbFLEX API    │
│                 │      │                 │      │                 │
│ ?id=20250623-003│─────>│ /api/track     │─────>│ Update Record   │
│                 │      │                 │      │ SALTY-20250623  │
│ Send beacon     │      │ Rate limit     │      │ -003            │
│ + timestamp     │      │ Validate ID    │      │                 │
│ + user agent    │      │ Add API key    │      │ last_accessed:  │
│                 │<─────│ Return 200 OK  │<─────│ timestamp       │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Key Flows

1. **Happy Path**: Link clicked → ID detected → Server notified → dbFLEX updated → Silent success
2. **No Tracking**: No ID parameter → Normal Salty operation → No tracking calls
3. **Failure Mode**: Tracking fails → Log error → Continue normally → User unaffected

---

## 4. Rabbit Holes

### ⚠️ Technical Risks

- **dbFLEX API Changes**: Their API might change → Use environment configs for easy updates
- **Rate Limit Complexity**: Could get complicated → Start with simple per-IP limits
- **Network Failures**: API calls might fail → Use fire-and-forget pattern, don't block user

### ⚠️ Design Complexity

- **Analytics Dashboard**: Could build complex reporting → Just update timestamps for now
- **Multiple ID Formats**: Different dbFLEX instances → Support only YYYYMMDD-NNN format
- **Batch Processing**: Queue and batch updates → Send individual requests for simplicity

### ⚠️ Integration Concerns

- **Authentication Methods**: Various dbFLEX auth types → Support only Bearer token auth
- **Field Mapping**: Custom dbFLEX schemas → Use fixed field names initially

---

## 5. No-gos

We are **NOT**:

- ❌ Building an analytics dashboard in Salty
- ❌ Tracking user behavior beyond initial access
- ❌ Storing tracking data in Salty (only forward to dbFLEX)
- ❌ Supporting multiple database backends
- ❌ Creating bidirectional sync with dbFLEX
- ❌ Adding visible UI elements for tracking
- ❌ Blocking page load if tracking fails

These are out of scope because:

- Salty remains a simple, privacy-focused tool
- Analytics belong in dbFLEX where the data lives
- Complex integrations would exceed the 2-week appetite
- We want zero impact on users who don't use dbFLEX
