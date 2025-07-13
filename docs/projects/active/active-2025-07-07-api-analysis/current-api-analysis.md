# Salty Current API Analysis

## Overview

Based on examination of `server.ts`, Salty currently provides a minimal API focused on core encryption/decryption operations. The API is designed with security as the primary concern.

## Current API Endpoints

### 1. **POST /api/encrypt**

Encrypts plaintext using AES-GCM-256 with a derived key.

**Request:**

- Method: `POST`
- Content-Type: `application/json`
- Headers:
  - `X-API-Key` (optional, required if API_KEY env var is set)
- Body:

```json
{
  "payload": "string", // Text to encrypt (max 1MB)
  "key": "string" // Encryption key (max 1KB)
}
```

**Response:**

```json
{
  "success": true,
  "data": "encrypted_base91_string",
  "timestamp": "2025-01-16T12:00:00.000Z"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "error_message",
  "timestamp": "2025-01-16T12:00:00.000Z"
}
```

### 2. **POST /api/decrypt**

Decrypts basE91-encoded encrypted text.

**Request:**

- Method: `POST`
- Content-Type: `application/json`
- Headers:
  - `X-API-Key` (optional, required if API_KEY env var is set)
- Body:

```json
{
  "payload": "string", // basE91-encoded encrypted text (max 1MB)
  "key": "string" // Decryption key (max 1KB)
}
```

**Response:**

```json
{
  "success": true,
  "data": "decrypted_plaintext",
  "timestamp": "2025-01-16T12:00:00.000Z"
}
```

### 3. **POST /api/track-access**

Tracks access to dbFLEX-generated links (optional feature).

**Request:**

- Method: `POST`
- Content-Type: `application/json`
- Body:

```json
{
  "id": "YYYYMMDD-NNN", // dbFLEX record ID format
  "timestamp": "ISO8601", // Access timestamp
  "userAgent": "string", // User agent string
  "referrer": "string" // Referrer URL
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2025-01-16T12:00:00.000Z"
}
```

### 4. **GET /health**

Health check endpoint providing system metrics.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T12:00:00.000Z",
  "version": "2.2.2",
  "buildInfo": { ... },
  "server": {
    "runtime": "Deno 1.40.0",
    "platform": "darwin",
    "uptime": 3600,
    "startTime": "2025-01-16T11:00:00.000Z"
  },
  "security": {
    "rateLimiting": { ... },
    "headersApplied": 8,
    "apiKeyRequired": true,
    "securityEvents": { ... }
  },
  "environment": { ... },
  "endpoints": [ ... ],
  "crypto": { ... },
  "metrics": { ... },
  "coverage": { ... }
}
```

### 5. **OPTIONS /api/***

CORS preflight handling for all API endpoints.

**Response:**

- Status: 204 No Content
- Headers include CORS configuration

### 6. **POST /api/csp-report**

Content Security Policy violation reporting endpoint.

**Request:**

- Method: `POST`
- Content-Type: `application/json`
- Body: CSP violation report format

**Response:**

- Status: 204 No Content

## Authentication

### API Key Authentication

- Optional: Only enforced if `API_KEY` environment variable is set
- Header: `X-API-Key`
- Type: Simple shared secret (base64 string)
- Comparison: Constant-time comparison for security

### No User Authentication

- The system is designed to be stateless
- No user accounts or sessions
- All operations are anonymous

## Security Features

### Rate Limiting

- **Window**: 1 hour (60 minutes)
- **Limit**: 20 requests per hour per IP
- **Storage**: In-memory (not distributed)
- **Cleanup**: Automatic every 5 minutes
- **Bypass**: API key holders are not exempt from rate limiting

### Input Validation

- **Payload Size**: Maximum 1MB (1024 * 1024 bytes)
- **Key Size**: Maximum 1KB (1024 bytes)
- **Content Type**: Must be `application/json`
- **Sanitization**: Null byte removal
- **Method**: Only POST allowed for API endpoints

### Security Headers

- Content Security Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()
- Strict-Transport-Security (HSTS)

### CORS Configuration

- Configurable allowed origins (env var `CORS_ALLOWED_ORIGINS`)
- Default: `https://salty.esolia.pro`, `http://localhost:8000`
- Methods: POST, OPTIONS
- Headers: Content-Type, X-API-Key
- Credentials: false

## Limitations & Missing Features

### Current Limitations

1. **No Batch Operations**
   - Must encrypt/decrypt one payload at a time
   - No bulk processing capability

2. **No Key Management**
   - No key generation endpoint
   - No key validation endpoint
   - No key rotation support

3. **Limited Response Formats**
   - Only JSON responses
   - No streaming support
   - No alternative encodings (base64, hex)

4. **Basic Error Handling**
   - Generic error messages for security
   - Limited error codes
   - No detailed validation feedback

5. **No Versioning**
   - No API version in URL or headers
   - No backward compatibility guarantees

6. **Limited Monitoring**
   - Basic metrics in /health
   - No per-endpoint detailed metrics
   - No request/response logging options

7. **No Advanced Features**
   - No encryption metadata
   - No expiring payloads
   - No signature verification
   - No compression options

### Authentication Limitations

1. **Simple API Key**
   - Single shared key for all clients
   - No per-client keys
   - No key rotation mechanism
   - No OAuth/JWT support

2. **No Granular Permissions**
   - All-or-nothing access
   - No read-only vs read-write distinction
   - No endpoint-specific permissions

### Infrastructure Limitations

1. **In-Memory Rate Limiting**
   - Not distributed across instances
   - Lost on server restart
   - No Redis/database backing

2. **No Caching**
   - No response caching
   - No CDN integration headers

3. **Limited Observability**
   - Basic telemetry only
   - No distributed tracing
   - No APM integration

## Potential Enhancements

### High Priority

1. Batch operations for multiple payloads
2. Key validation endpoint
3. API versioning strategy
4. Enhanced error codes and messages
5. Request ID tracking

### Medium Priority

1. Alternative response formats (base64, hex)
2. Encryption metadata support
3. Per-client API keys
4. Webhook notifications for events
5. Compression support

### Low Priority

1. GraphQL endpoint
2. WebSocket support for real-time operations
3. SDK generation
4. OpenAPI/Swagger documentation
5. Rate limit status headers

## Conclusion

The current Salty API is minimal but secure, focusing on core encryption/decryption functionality. It follows security best practices but lacks many features expected in a modern Developer API. The API is suitable for basic programmatic access but would benefit from enhancements to support more complex use cases and better developer experience.
