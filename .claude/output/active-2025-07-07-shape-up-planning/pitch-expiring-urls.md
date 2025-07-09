# Expiring URLs Pitch

**Start Date**: July 2025
**Completion Date**: TBD
**Status**: Shaping 🔨

## 1. Problem

**The Problem**: Encrypted payloads shared via URL remain valid forever, creating a permanent security exposure even after the intended recipient has accessed the content.

**When it happens**:

- User shares sensitive encrypted data via Salty URL
- Recipient accesses and decrypts the message
- URL remains valid indefinitely in:
  - Email histories
  - Chat logs
  - Browser histories
  - Server logs
  - Cached pages

**Who it affects**:

- Security-conscious organizations sharing sensitive data
- Users sharing time-sensitive information
- Compliance-bound users who need audit trails
- Anyone concerned about long-term data exposure

**Current workaround**:

- Users must trust recipients to not share URLs
- No way to revoke access after sharing
- Manual deletion of messages from communication channels
- Relying on encryption key secrecy alone

**Why now**:

- Growing adoption means more sensitive data in URLs
- Compliance requirements increasingly demand time-limited access
- Without KV, we need a creative solution before Deno Deploy adds it

### Evidence

- Enterprise users requesting time-limited sharing
- Security audits flag permanent URLs as a risk
- Encrypted URLs found in public paste bins and forums

---

## 2. Appetite

⏱️ **Small Batch** (2 weeks)

This is a Small Batch project because:

- No backend infrastructure changes needed
- Pure client-side implementation possible
- Limited scope to URL generation and validation
- Can ship meaningful security improvement quickly

---

## 3. Solution

### Core Insight

Embed expiration data directly in the encrypted payload using a two-layer approach:

1. Inner layer: Original message + expiration timestamp
2. Outer layer: Standard Salty encryption of the inner layer

### Approach

**Encoding Expiration**:

```
Original: "Secret message"
With expiry: {"m":"Secret message","e":1234567890}
Encrypted: [Standard Salty encryption of JSON]
```

**Validation Flow**:

1. Decrypt payload normally
2. Parse JSON to extract message and expiry
3. Check if current time > expiry time
4. Show message or expiration notice

### Elements

#### Breadboard

```
Places:     [Create]         →    [Share URL]    →    [Access URL]    →    [Validate]
             ↓                      ↓                   ↓                   ↓
Affordances: • Set expiry         • Copy URL         • Load page         • Check time
             • Encrypt msg         • Share link       • Enter key         • Show/Block
             • Generate URL                           • Decrypt

Visual Indicators:
- Creation: "⏰ Expires in: 24 hours"
- Sharing: URL contains encrypted expiry
- Access: "🔓 Valid for: 23h 45m" or "❌ This message has expired"
```

### Key Flows

1. **Creating Expiring URL**:
   - User enters message
   - Selects expiration (1h, 24h, 7d, 30d, custom)
   - System wraps message with expiry timestamp
   - Encrypts the wrapped payload
   - Generates URL as normal

2. **Accessing Valid URL**:
   - User opens URL with payload
   - Enters decryption key
   - System decrypts and checks expiry
   - Shows message with remaining time
   - Visual indicator of time sensitivity

3. **Accessing Expired URL**:
   - User opens URL with payload
   - Enters decryption key
   - System decrypts and finds expired timestamp
   - Shows friendly expiration message
   - NO access to original content

### UI Additions

**Creation Page**:

```
[Payload field]
[Key field]

[⏰ Message expires in: [Dropdown v]]
   • 1 hour
   • 24 hours
   • 7 days
   • 30 days
   • Custom...

[Encrypt button]
```

**Decryption Page**:

```
[If valid]:
✅ This message expires in 23 hours, 45 minutes

[If expired]:
❌ This message expired on July 7, 2025 at 3:45 PM
The content is no longer accessible.
```

---

## 4. Rabbit Holes

### ⚠️ Security Considerations

**Risk**: Expiry time is visible after decryption

- **Mitigation**: This is acceptable - expiry enforcement happens client-side anyway
- **Note**: True server-side expiry requires KV (future enhancement)

**Risk**: Users could modify JavaScript to bypass expiry

- **Mitigation**: Document this as client-side security feature
- **Future**: Server-side validation when KV available

### ⚠️ Technical Challenges

**Challenge**: Backward compatibility with existing URLs

- **Solution**: Try JSON parse after decrypt; fall back to raw message
- **Pattern**: `try { JSON.parse } catch { return as-is }`

**Challenge**: URL length with additional JSON structure

- **Solution**: Minimal JSON keys ("m" for message, "e" for expiry)
- **Alternative**: Binary packing if needed

### ⚠️ UX Complexity

**Challenge**: Explaining client-side expiration

- **Solution**: Clear messaging: "Expiration is enforced by the recipient's browser"
- **Documentation**: Security model explanation

---

## Implementation Details

### Component Breakdown

**1. Salty UI (Web Interface)**:

- Add expiration dropdown to encryption form
- Wrap message in JSON before encryption: `{"m":"message","e":1234567890}`
- On decryption: parse JSON, check expiry, show/hide content
- Display remaining time or expiration message

**2. Salty API Endpoint**:

- Accept JSON payload format in encryption requests
- Return ciphertext as normal (no API changes needed)
- Expiry is transparent to API - just encrypting JSON instead of plain text

**3. Database/Integration Side**:

- When building share URLs, can optionally add expiry to the JSON
- Format: `{"m":"database content","e":epoch_timestamp}`
- Encrypt this JSON via Salty API
- Build share URL with returned ciphertext
- Database can store expiry for its own tracking (optional)

### API Flow Example

**Database → Salty API**:

```json
POST /api/encrypt
{
  "message": "{\"m\":\"Sensitive database record\",\"e\":1720378800}",
  "key": "user_provided_key"
}
```

**Salty API → Database**:

```json
{
  "encrypted": "basE91_encoded_ciphertext_here",
  "status": "success"
}
```

**Database builds URL**:

```
https://salty.esolia.pro/en/?payload=basE91_encoded_ciphertext_here
```

### Backward Compatibility

- Existing integrations continue working (they just encrypt plain text)
- New integrations can opt-in to expiry by sending JSON
- Decryption handles both formats:
  ```javascript
  try {
    const data = JSON.parse(decrypted);
    if (data.e && Date.now() > data.e * 1000) {
      // Expired
    }
    return data.m; // The actual message
  } catch {
    return decrypted; // Old format, no expiry
  }
  ```

---

## 5. No-gos

We are **NOT**:

- ❌ Building server-side expiration (requires KV)
- ❌ Preventing determined users from bypassing client-side checks
- ❌ Tracking access counts or implementing one-time URLs
- ❌ Creating audit logs of access attempts
- ❌ Implementing revocation (requires server state)
- ❌ Adding authentication beyond the encryption key

These are out of scope because:

- No server-side storage available yet
- Maintaining Salty's stateless architecture
- Keeping implementation simple and shippable
- Future enhancement when KV available

---

## Alternative Approaches Considered

### 1. **Epoch Suffix Approach** (Rejected)

```
?payload=abc123&expire=1234567890
```

- ❌ Too discoverable
- ❌ Easy to modify
- ❌ Breaks existing URL structure

### 2. **Separate Expiry Hash** (Rejected)

```
?payload=abc123&sig=xyz789
```

- ❌ Requires server verification
- ❌ Adds complexity
- ❌ Still modifiable

### 3. **Encrypted Envelope** (Selected ✓)

- ✅ Works within existing architecture
- ✅ Expiry protected by encryption
- ✅ Backward compatible
- ✅ Clean implementation

---

## Success Metrics

- Users create expiring URLs for >20% of shares
- Zero breaking changes to existing URLs
- Implementation completed in 2-week cycle
- Clear documentation of security model
- Path clear for server-side enhancement with KV
