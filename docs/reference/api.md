# API reference

## Overview

The Salty API provides programmatic access to encryption, decryption, and password derivation 
operations. All API endpoints require authentication when the `API_KEY` environment variable is 
configured.

## Synopsis

```
POST /api/{operation}
Authorization: X-API-Key: {api-key}
Content-Type: application/json
```

## Description

The Salty API exposes cryptographic operations through RESTful endpoints. All operations are 
performed server-side using the same cryptographic primitives as the web interface. The server 
never logs or stores plaintext data, keys, or derived passwords.

## Authentication

### `X-API-Key` header {#x-api-key}

**Type**: `string`  
**Required**: Yes (when `API_KEY` environment variable is set)  
**Format**: Base64-encoded string  

The API key must be included in all requests to API endpoints when authentication is enabled.

**Example**:
```bash
curl -H "X-API-Key: your-base64-api-key" https://salty.example.com/api/encrypt
```

## Endpoints

### POST `/api/encrypt` {#encrypt}

Encrypts a message using AES-GCM-256 with a key derived via PBKDF2-SHA512.

**Request Body**:
```json
{
  "message": "string",
  "key": "string"
}
```

**Parameters**:
- `message` (required): The plaintext to encrypt
- `key` (required): The password for key derivation

**Response**:
```json
{
  "encrypted": "string",
  "success": true
}
```

**Example**:
```bash
curl -X POST https://salty.example.com/api/encrypt \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "Secret database password",
    "key": "my-encryption-password"
  }'
```

### POST `/api/decrypt` {#decrypt}

Decrypts a payload that was encrypted using the encrypt endpoint.

**Request Body**:
```json
{
  "payload": "string",
  "key": "string"
}
```

**Parameters**:
- `payload` (required): The basE91-encoded encrypted data
- `key` (required): The password used for encryption

**Response**:
```json
{
  "decrypted": "string",
  "success": true
}
```

**Example**:
```bash
curl -X POST https://salty.example.com/api/decrypt \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "payload": "yXJ%8Kd#mP9$vN2@rL5^qT1&wX3!",
    "key": "my-encryption-password"
  }'
```

### POST `/api/derive` {#derive}

Derives a deterministic password using PBKDF2-SHA512 and AES-GCM-256.

**Request Body**:
```json
{
  "key": "string",
  "salt": "string"
}
```

**Parameters**:
- `key` (required): The master password
- `salt` (required): The unique identifier (e.g., site name)

**Response**:
```json
{
  "derived": "string",
  "success": true
}
```

**Example**:
```bash
curl -X POST https://salty.example.com/api/derive \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "key": "my-master-password",
    "salt": "github.com:myusername"
  }'
```

### GET `/health` {#health}

Returns system health information. Does not require authentication.

**Response**:
```json
{
  "status": "healthy",
  "version": "1.62.8",
  "environment": "production",
  "timestamp": "2024-03-20T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": 10485760,
    "heapTotal": 20971520,
    "external": 1048576,
    "rss": 52428800
  }
}
```

**Example**:
```bash
curl https://salty.example.com/health
```

## Request Limits

### Payload Size Limits {#size-limits}

- **Maximum payload size**: 1MB (1,048,576 bytes)
- **Maximum key size**: 1KB (1,024 bytes)

Requests exceeding these limits will return a 413 Payload Too Large error.

### Rate Limiting {#rate-limiting}

- **Limit**: 20 requests per hour per IP address
- **Window**: Rolling 1-hour window
- **Headers**: Rate limit information included in responses
  - `X-RateLimit-Limit`: 20
  - `X-RateLimit-Remaining`: Number of requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## Error Responses

### Error Format

All errors return a consistent JSON structure:

```json
{
  "error": "string",
  "success": false,
  "code": "string"
}
```

### Common Errors

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Missing or invalid parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 413 | `PAYLOAD_TOO_LARGE` | Request body exceeds size limits |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Content-Type must be application/json |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error (generic) |

### Error Examples

**Missing API Key**:
```json
{
  "error": "API key required",
  "success": false,
  "code": "UNAUTHORIZED"
}
```

**Invalid Parameters**:
```json
{
  "error": "Missing required parameter: key",
  "success": false,
  "code": "INVALID_REQUEST"
}
```

**Rate Limit Exceeded**:
```json
{
  "error": "Too many requests. Please try again later.",
  "success": false,
  "code": "RATE_LIMIT_EXCEEDED"
}
```

## Security Headers

All API responses include security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
```

## CORS Configuration

The API supports CORS for browser-based applications:

- **Allowed Origins**: Configured via environment
- **Allowed Methods**: POST, GET, OPTIONS
- **Allowed Headers**: Content-Type, X-API-Key
- **Max Age**: 86400 seconds (24 hours)

## Examples

### Basic Usage

**Encrypt sensitive data**:
```bash
#!/bin/bash
API_KEY="your-api-key"
SALTY_URL="https://salty.example.com"

SECRET="DATABASE_PASSWORD=Pr0duct10n2024!"
PASSWORD="team-shared-key"

ENCRYPTED=$(curl -s -X POST "${SALTY_URL}/api/encrypt" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"message\": \"${SECRET}\", \"key\": \"${PASSWORD}\"}" \
  | jq -r '.encrypted')

echo "Encrypted: ${ENCRYPTED}"
```

**Derive a password**:
```bash
MASTER_PASS="my-secure-master-password"
SITE="amazon.com:john.doe@example.com"

PASSWORD=$(curl -s -X POST "${SALTY_URL}/api/derive" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"key\": \"${MASTER_PASS}\", \"salt\": \"${SITE}\"}" \
  | jq -r '.derived')

echo "Derived password: ${PASSWORD}"
```

### Advanced Usage

**Error handling**:
```python
import requests
import sys

def safe_encrypt(message, key, api_key, base_url):
    try:
        response = requests.post(
            f"{base_url}/api/encrypt",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": api_key
            },
            json={"message": message, "key": key},
            timeout=30
        )
        
        if response.status_code == 429:
            print("Rate limit exceeded. Try again later.")
            return None
        elif response.status_code == 401:
            print("Invalid API key.")
            return None
        elif response.status_code == 200:
            return response.json()["encrypted"]
        else:
            print(f"Error: {response.json().get('error', 'Unknown error')}")
            return None
            
    except requests.RequestException as e:
        print(f"Request failed: {e}")
        return None
```

**Batch operations with rate limit handling**:
```javascript
async function batchEncrypt(items, key, apiKey, baseUrl) {
  const results = [];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  for (const item of items) {
    try {
      const response = await fetch(`${baseUrl}/api/encrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          message: item,
          key: key
        })
      });
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const waitTime = (resetTime * 1000) - Date.now();
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await delay(waitTime);
        // Retry
        continue;
      }
      
      const data = await response.json();
      results.push(data.encrypted);
      
      // Be nice to the API
      await delay(3000); // 3 second delay between requests
      
    } catch (error) {
      console.error(`Failed to encrypt item: ${error}`);
    }
  }
  
  return results;
}
```

## See also

- [Configuration Reference](./configuration.md) - Environment variables and settings
- [How to Set Up API Authentication](../how-to/setup-api-auth.md) - Detailed authentication guide
- [Security Architecture](../explanation/security-architecture.md) - Understanding the security model