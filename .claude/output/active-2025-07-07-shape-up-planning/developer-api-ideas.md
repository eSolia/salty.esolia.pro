# Developer API Enhancement Ideas

## Current State

We have basic endpoints:

- `/api/encrypt` - Single message encryption
- `/api/decrypt` - Single message decryption
- `/api/track-access` - dbFLEX integration
- `/health` - System health
- Simple API key auth (shared key)

## What's Missing for Developers

### 1. **Batch Operations**

```json
POST /api/batch/encrypt
{
  "operations": [
    {"id": "1", "message": "Secret 1", "key": "key1"},
    {"id": "2", "message": "Secret 2", "key": "key2"}
  ]
}
```

**Why**: Database integrations often need to encrypt multiple records

### 2. **Key Derivation Service**

```json
POST /api/keys/derive
{
  "master_key": "user_password",
  "context": "email@example.com",
  "iterations": 600000
}
Response: {
  "derived_key": "base64_key",
  "salt": "hex_salt"
}
```

**Why**: Consistent key derivation across different platforms

### 3. **Signed Payloads**

```json
POST /api/encrypt/signed
{
  "message": "Important data",
  "key": "encryption_key",
  "signing_key": "identity_key"
}
Response: {
  "encrypted": "ciphertext",
  "signature": "signature",
  "timestamp": 1234567890
}
```

**Why**: Prove authorship and prevent tampering

### 4. **Webhook Endpoints**

```json
POST /api/webhooks
{
  "url": "https://app.com/hook",
  "events": ["encryption", "decryption_failure"],
  "secret": "webhook_secret"
}
```

**Why**: Audit trails, monitoring, integrations

### 5. **Client Libraries & SDKs**

- Official Node.js/Deno package
- Python client
- Go client
- OpenAPI specification
- Postman collection

### 6. **API Key Management**

```json
POST /api/keys/create
{
  "name": "Production App",
  "permissions": ["encrypt", "decrypt"],
  "rate_limit": 1000
}
Response: {
  "api_key": "sk_live_abc123...",
  "key_id": "key_123"
}
```

**Why**: Per-client keys, granular permissions, better security

### 7. **Metadata & Tagging**

```json
POST /api/encrypt
{
  "message": "Secret",
  "key": "key",
  "metadata": {
    "user_id": "123",
    "session": "abc",
    "tags": ["invoice", "2024-Q1"]
  }
}
```

**Why**: Track encrypted data without exposing content

### 8. **Format Options**

```json
POST /api/encrypt
{
  "message": "Secret",
  "key": "key",
  "output_format": "base64" // or "hex", "basE91"
}
```

**Why**: Different systems have different encoding needs

### 9. **Streaming API**

```
POST /api/stream/encrypt
Content-Type: application/octet-stream

[Binary data stream]
```

**Why**: Large file encryption without loading in memory

### 10. **API Versioning**

```
/api/v1/encrypt (current)
/api/v2/encrypt (with new features)
```

**Why**: Backward compatibility while adding features

## Most Valuable for Shape Up

Based on user needs, the highest impact would be:

1. **Batch Operations** - Immediate value for database integrations
2. **Client Libraries** - Lower barrier to adoption
3. **API Key Management** - Better security and client isolation
4. **Metadata Support** - Enable tracking without privacy compromise

These could be shaped as a 6-week cycle "Developer Experience" project.
