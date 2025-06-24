# Salty App Comprehensive Summary

## Project Overview
Salty is a TypeScript/Deno-based secure text encryption application using AES-GCM and basE91 encoding. It provides both a web UI and API endpoints for encryption/decryption operations.

## Architecture
- **Backend**: Deno Deploy with TypeScript
- **Frontend**: Browser-native JavaScript (no build step)
- **Crypto**: Web Crypto API (AES-GCM-256, PBKDF2-SHA512, 600k iterations)
- **Encoding**: basE91 for portability
- **Security**: Rate limiting, input validation, security headers, structured logging

## File Structure
```
.
├── server.ts          # Main Deno server with security features
├── salty.ts           # Core crypto functions (TypeScript for server)
├── index.html         # Japanese UI
├── en/index.html      # English UI
├── logger.ts          # Structured logging system
├── telemetry.ts       # OpenTelemetry-style tracing
├── version.ts         # Centralized version management
├── img/               # eSolia branding assets
├── LICENSE
└── README.md
```

## Key Technical Solutions

### 1. TypeScript/JavaScript Compatibility Issue
**Problem**: Browser can't parse TypeScript syntax served from salty.ts
**Solution**: Server-side transpilation using Deno's bundle API
**Implementation**:
```typescript
import { bundle } from "https://deno.land/x/emit@0.32.0/mod.ts";

// In serveFile() for '/salty.ts':
const result = await bundle(new URL('./salty.ts', import.meta.url));
const jsContent = result.code;
```

### 2. Salt Injection for Client-Side Crypto
**Problem**: Client needs server's SALT_HEX for key derivation
**Solution**: Server injects salt into HTML at serve time
**Implementation**:
```typescript
// In serveFile() for HTML files:
const placeholder = 'SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER';
if (htmlContent.includes(placeholder)) {
  htmlContent = htmlContent.replace(placeholder, saltHex);
}
```

### 3. URL Parameter Handling for Database Integration
**Problem**: Database URLEncode() doesn't encode all basE91 characters properly
**Solution**: Database-side character replacement before URL encoding
**Database Formula**:
```
URLEncode(Replace(Replace(Replace(Replace(Replace(Replace([Salty Encrypted Payload], "%", "%25"), ")", "%29"), "~", "%7E"), "\"", "%22"), "(", "%28"), "?", "%3F"))
```

### 4. Security Architecture
- **Rate Limiting**: 20 requests/hour per IP
- **Input Validation**: Size limits, sanitization, type checking
- **Security Headers**: CSP, HSTS, XSS protection, etc.
- **API Authentication**: Optional API_KEY environment variable
- **Structured Logging**: Security events, performance metrics, request tracing

## Environment Variables
- `SALT_HEX`: 32-char hex string for PBKDF2 (required)
- `API_KEY`: Base64 API authentication key (optional)
- `LOG_LEVEL`: DEBUG|INFO|WARN|ERROR (optional, default: INFO)
- `WEBHOOK_URL`: Critical alert notifications (optional)

## API Endpoints
- `POST /api/encrypt`: Encrypt plaintext to basE91
- `POST /api/decrypt`: Decrypt basE91 to plaintext  
- `GET /health`: Comprehensive system status
- `GET /`: Japanese UI
- `GET /en/`: English UI
- `GET /salty.ts`: Transpiled JavaScript for browser

## Security Features
- Rate limiting with IP-based windows
- Request size limits (1MB payload, 1KB key)
- Input sanitization and validation
- Security headers (A+ rating compatible)
- Structured security event logging
- API key authentication
- Content Security Policy
- HTTPS enforcement

## Database Integration
**Workflow**:
1. Database encrypts text via API
2. Database generates URL with encoded basE91 in payload parameter
3. Email/share URL (encrypted data)
4. Separately communicate key (phone/different channel)
5. Recipient clicks URL → payload pre-populated → enters key → decrypts

## Common Issues & Solutions

### TypeScript Import Errors
- **Cause**: Browser trying to parse TypeScript
- **Fix**: Ensure Deno bundle transpilation is working in server.ts

### Salt Not Injected
- **Cause**: Placeholder not found in HTML
- **Fix**: Verify 'SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER' exists in HTML files

### URL Parameters Not Working
- **Cause**: Malformed URL encoding from database
- **Fix**: Use comprehensive Replace() formula in database before URLEncode()

### 404 on /salty.ts
- **Cause**: Server routing not handling transpilation path
- **Fix**: Ensure '/salty.ts' handler comes before generic file handling

## Development Notes
- **No build step**: Direct TypeScript deployment to Deno Deploy
- **Client-side crypto**: All encryption happens in browser for security
- **Dual architecture**: TypeScript for server, transpiled JavaScript for browser
- **Font**: IBM Plex Sans JP for both languages
- **Styling**: Tailwind CSS via CDN
- **Analytics**: Fathom integration
- **Branding**: eSolia Inc. corporate identity

## Testing Checklist
- [ ] API encrypt/decrypt via POST requests
- [ ] Manual UI encrypt/decrypt with form
- [ ] URL parameter pre-population from database
- [ ] Salt injection visible in browser console
- [ ] Security headers present in responses
- [ ] Rate limiting blocks excessive requests
- [ ] Health endpoint returns comprehensive status

## Recent Refactoring (June 2025)
- Added comprehensive logging and telemetry
- Implemented security middleware and rate limiting
- Created centralized version management
- Fixed TypeScript/browser compatibility
- Enhanced URL parameter handling for database integration
- Improved error handling and user feedback