# How to Share Encrypted Payloads

This guide shows you how to securely share sensitive information using Salty's encryption features. Use this approach when you need to transmit passwords, API keys, or confidential data.

## Before you begin

Ensure you have:
- Access to a Salty instance
- A secure method to share the encryption key (separate channel)
- Understanding of basic encryption concepts

## Solution

### Option 1: Interactive Sharing (Web Interface)

Use this approach for one-time sharing with non-technical users.

1. Navigate to your Salty instance

2. Click the **Encrypt/Decrypt** toggle to switch to encryption mode

3. Enter the sensitive data in the **Payload** field:
   ```
   Database Password: Pr0d#2024$ecure
   API Key: sk-proj-1234567890abcdef
   Connection String: postgres://user:pass@host:5432/db
   ```

4. Create a strong encryption key:
   ```
   Example: project-alpha-2024-Q1-security-key
   ```

5. Click **Salty!** to encrypt

6. Copy the encrypted output:
   ```
   Example: yXJ%8Kd#mP9$vN2@rL5^qT1&wX3!zY7*...
   ```

7. Share the encrypted payload via your primary channel (email, Slack, etc.)

8. Share the encryption key via a different secure channel:
   - Phone call or SMS
   - Secure messaging app
   - Password manager with sharing feature
   - In-person communication

### Option 2: URL-Based Sharing

Use this approach for automated workflows or technical users.

1. Encrypt your payload as described above

2. Create a sharing URL:
   ```
   https://salty.example.com/?payload=yXJ%8Kd%23mP9%24vN2...
   ```

3. For a cleaner interface, add the sharing UI parameter:
   ```
   https://salty.example.com/?payload=yXJ%8Kd%23mP9%24vN2...&sui=1
   ```

4. Share the URL and key separately

### Option 3: API-Based Sharing (Programmatic)

Use this approach for automated systems and integrations.

1. Prepare your payload:
   ```json
   {
     "api_key": "sk-1234567890",
     "endpoint": "https://api.example.com",
     "rate_limit": 1000
   }
   ```

2. Encrypt using the API:
   ```bash
   curl -X POST https://salty.example.com/api/encrypt \
     -H "Content-Type: application/json" \
     -H "X-API-Key: $SALTY_API_KEY" \
     -d '{
       "message": "{\"api_key\":\"sk-1234567890\"}",
       "key": "integration-key-2024"
     }'
   ```

3. Extract the encrypted result from the response

4. Store or transmit the encrypted data

## Verify your encryption

### Test Decryption

Before sharing, always verify decryption works:

1. Switch to decrypt mode
2. Paste your encrypted payload
3. Enter the same key
4. Verify the original data appears correctly

### Check Encryption Strength

Salty uses industry-standard encryption:
- **Algorithm**: AES-GCM-256
- **Key Derivation**: PBKDF2-SHA512 (600,000 iterations)
- **Encoding**: basE91 for efficient text representation

## Security best practices

### Key Sharing Methods

**Secure methods** (recommended):
- ✓ Phone call for verbal communication
- ✓ Separate encrypted messaging app
- ✓ Pre-shared key in password manager
- ✓ In-person key exchange

**Insecure methods** (avoid):
- ✗ Same email as encrypted payload
- ✗ Unencrypted SMS
- ✗ Public chat channels
- ✗ Git commits or code repositories

### Workflow Patterns

```mermaid
graph TD
    A[Sensitive Data] --> B[Encrypt with Salty]
    B --> C[Encrypted Payload]
    B --> D[Encryption Key]
    C --> E[Send via Email/Slack]
    D --> F[Share via Phone/Secure Channel]
    E --> G[Recipient]
    F --> G
    G --> H[Decrypt with Salty]
    H --> I[Original Data]
```

## Common use cases

### Sharing Database Credentials
```
Payload:
host=db.example.com
port=5432
username=app_user
password=Str0ng#P@ssw0rd
database=production

Key: proj-db-creds-2024-03
```

### API Key Distribution
```
Payload:
SERVICE_API_KEY=sk-proj-1234567890abcdef
SERVICE_URL=https://api.service.com/v2
RATE_LIMIT=1000

Key: service-integration-Q1-2024
```

### Configuration Secrets
```
Payload:
JWT_SECRET=your-256-bit-secret-here
SESSION_SECRET=another-strong-secret
ENCRYPTION_KEY=aes-256-key-value

Key: app-secrets-prod-v2
```

## Troubleshooting

**Problem**: Decryption fails with "Invalid payload"
**Solution**: Ensure the encrypted text wasn't modified during transmission (check for truncation or encoding issues)

**Problem**: Decryption returns garbage characters
**Solution**: Verify you're using the exact same key (case-sensitive)

**Problem**: Payload too large to share via certain channels
**Solution**: Consider splitting into multiple encrypted chunks or using file-based sharing

**Problem**: Recipient can't access Salty instance
**Solution**: Use a public instance or provide them with a standalone decryption tool

## Advanced patterns

### Time-Limited Sharing

For temporary access:
1. Include expiration in the payload:
   ```
   password=TempPass123!
   expires=2024-03-31T23:59:59Z
   ```

2. Rotate the encryption key after expiration

### Multi-Recipient Sharing

For team sharing:
1. Encrypt once with a team key
2. Share the team key via secure password manager
3. Revoke access by rotating the team key

### Audit Trail

For compliance:
1. Log encryption events (without sensitive data)
2. Track who received encrypted payloads
3. Monitor decryption attempts via access logs

## Related tasks

- [How to Generate Secure Passwords](./generate-passwords.md)
- [How to Configure Security Settings](./configure-security.md)
- [How to Set Up API Authentication](./setup-api-auth.md)
- [How to Monitor with OpenTelemetry](./monitor-telemetry.md)