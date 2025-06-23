# Salty: Browser-Native Secure Text Encryption

Salty (<https://salty.esolia.pro>) is a comprehensive, web-based application designed for secure text encryption and decryption using a shared key. It leverages the browser's built-in Web Crypto API for robust cryptographic operations, ensuring that sensitive data is processed client-side. The application employs basE91 encoding for portability, making the encrypted output suitable for various communication channels, including those with length limitations.

## Features

### Core Encryption Features
* **Browser-Native Encryption**: Utilizes the Web Crypto API for strong, client-side encryption (AES-GCM-256) and key derivation (PBKDF2-SHA512 with 600,000 iterations)
* **Shared Key Security**: Securely encrypt and decrypt messages using a shared passphrase
* **Automatic Detection**: Intelligently detects whether the input payload is plaintext (to be encrypted) or a Salty-encrypted cipher (to be decrypted)
* **basE91 Encoding**: Encrypted output is encoded using basE91, providing a compact and portable format
* **URL Parameter Support**: Pre-populate payload via URL parameters for database integration workflows

### Security Features (v1.1.0)
* **Rate Limiting**: 20 requests per hour per IP address to prevent abuse
* **Input Validation**: Comprehensive sanitization and size limits (1MB payload, 1KB key)
* **Security Headers**: Content Security Policy, HSTS, XSS protection, and more
* **API Authentication**: Optional API key protection for server endpoints
* **Structured Logging**: Security event tracking and performance monitoring
* **Request Size Limits**: Protection against oversized payloads

### User Experience Features
* **Responsive UI**: Designed with Tailwind CSS for clean and adaptive user experience across devices
* **Multi-language Support**: Available in English and Japanese with proper font support (IBM Plex Sans JP)
* **Clipboard Integration**: Easy one-click copying of encrypted or decrypted text to the clipboard
* **Real-time Feedback**: User-friendly messages and error handling
* **Modal Help System**: Comprehensive documentation accessible within the application

## Technologies Used

### Backend
* **Deno**: Powers the server-side backend with native TypeScript support
* **TypeScript**: Used for type-safe server-side development with comprehensive interfaces
* **Deno Deploy**: Cloud deployment platform with automatic HTTPS and global distribution

### Security & Monitoring
* **Structured Logging**: Comprehensive logging system with categories, levels, and security event tracking
* **OpenTelemetry-style Tracing**: Custom telemetry integration for performance monitoring
* **Centralized Version Management**: Single source of truth for version information and metadata

### Frontend
* **Web Crypto API**: Browser's native cryptographic interface for secure operations
* **basE91**: Efficient binary-to-text encoding scheme optimized for compactness
* **HTML, CSS (Tailwind CSS)**: Modern styling framework for responsive design
* **ES6 Modules**: Native browser module system with server-side TypeScript transpilation

### Cryptographic Specifications
* **Key Derivation**: PBKDF2 with SHA-512, 600,000 iterations, 256-bit output
* **Encryption**: AES-GCM with 12-byte IV, 128-bit authentication tag
* **Encoding**: basE91 for maximum portability and compactness

## Security Confirmation

### Encryption & Key Derivation

**Key Derivation (`salty_key()`)**
* ✅ PBKDF2 with SHA-512: Strong, industry-standard hash function
* ✅ 600,000 iterations: Excellent resistance against brute-force attacks
* ✅ 32-byte key (256-bit): Optimal for AES-GCM encryption
* ✅ Cryptographically secure salt: Server-configured hex salt

**Encryption (`salty_encrypt()`)**
* ✅ AES-GCM with 12-byte IV: Secure and authenticated encryption
* ✅ Randomly generated IV: Best practice for semantic security
* ✅ 128-bit authentication tag: Standard and secure tag length
* ✅ IV + ciphertext concatenation: Correct format for decryption

**Decryption (`salty_decrypt()`)**
* ✅ Proper IV and ciphertext extraction with length validation
* ✅ AES-GCM with correct parameters matching encryption
* ✅ Graceful error handling for invalid ciphertext or wrong keys
* ✅ Null return for failed operations

**basE91 Encoding/Decoding**
* ✅ Standards-compliant implementation following original basE91 specification
* ✅ Correct character tables and bitwise operations
* ✅ Robust error handling for invalid input

## Getting Started

### Prerequisites

* [Deno](https://deno.land/manual/getting_started/installation) installed locally (for development/testing)
* A Deno Deploy account (for production deployment)
* A `SALT_HEX` environment variable: 32-character hexadecimal representation of 16 cryptographically secure random bytes
* A base64 `API_KEY` environment variable (optional, for API authentication)

### Environment Variable Generation

**Generate SALT_HEX** (using OpenSSL - recommended):
```bash
openssl rand -hex 16 | tr '[:lower:]' '[:upper:]'
```

**Generate API_KEY** (using OpenSSL):
```bash
openssl rand -base64 32
```

**Alternative using Deno**:
```typescript
// For SALT_HEX
deno eval "console.log(Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase())"

// For API_KEY  
deno eval "console.log(btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))))"
```

### Project Structure

```
.
├── server.ts              # Enhanced server with security and logging
├── salty.ts               # Core cryptographic functions (TypeScript)
├── logger.ts              # Structured logging system
├── telemetry.ts           # OpenTelemetry-style tracing
├── version.ts             # Centralized version and metadata management
├── index.html             # Japanese user interface
├── en/
│   └── index.html         # English user interface
├── img/                   # eSolia branding assets
│   ├── symbol_white_bgtransparent.svg
│   └── logo_horiz_white_bgtransparent.svg
├── LICENSE                # MIT License
└── README.md              # This file
```

### Local Development

1. **Clone the repository** and ensure you have all required files
2. **Set environment variables**:
   ```bash
   export SALT_HEX="YOUR_GENERATED_32_CHAR_HEX_STRING"
   export API_KEY="YOUR_GENERATED_BASE64_KEY"  # Optional
   export LOG_LEVEL="DEBUG"  # Optional, for development
   ```
3. **Run the Deno server**:
   ```bash
   deno run --allow-net --allow-read --allow-env server.ts
   ```
4. **Open browser** and navigate to:
   - <http://localhost:8000/> (Japanese UI)
   - <http://localhost:8000/en/> (English UI)

### Deployment to Deno Deploy

1. **Create a new Deno Deploy project**
2. **Link to your GitHub repository** main branch
3. **Set entry point** to `server.ts`
4. **Configure Environment Variables** in project settings:
   
   **Required:**
   - `SALT_HEX`: Your generated 32-character hexadecimal salt (required for cryptographic operations)
   
   **Optional:**
   - `API_KEY`: Your generated base64 API key (enables API authentication; if not set, API endpoints are unprotected)
   - `LOG_LEVEL`: Logging verbosity level (defaults to INFO)
     - Available options: `DEBUG`, `INFO`, `WARN`, `ERROR`, `SECURITY`, `CRITICAL`
     - Recommended: `INFO` for production, `DEBUG` for development
   - `LOG_FORMAT`: Output format for logs (defaults to JSON)
     - Available options: `json`, `text`
     - `json`: Structured JSON logging for production monitoring
     - `text`: Human-readable format for development
   - `WEBHOOK_URL`: Webhook URL for critical alerts (optional)
     - Format: Standard webhook URL (e.g., Slack, Discord, Microsoft Teams, or custom endpoint)
     - When set, critical errors and security events will be sent to the webhook endpoint
   - `NODE_ENV`: Environment identifier (defaults to production)
     - Available options: `development`, `staging`, `production`
     - Affects logging behavior and security settings
5. **Deploy** - Deno Deploy will automatically handle TypeScript compilation

### Environment Variable Examples

**Minimal Production Setup:**
```
SALT_HEX=073E58F04F052C4759D50366656BAF55
```

**Full Production Setup with Monitoring:**
```
SALT_HEX=073E58F04F052C4759D50366656BAF55
API_KEY=54cz+XMiorw1VjZZ3p4Xm/RdMwDOGV/mkorEgyyN1OI=
LOG_LEVEL=INFO
LOG_FORMAT=json
WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
NODE_ENV=production
```

**Development Setup:**
```
SALT_HEX=073E58F04F052C4759D50366656BAF55
LOG_LEVEL=DEBUG
LOG_FORMAT=text
NODE_ENV=development
```

### Log Level Behavior

Different log levels control what information is captured:

- **DEBUG**: All messages including detailed function entry/exit, variable values, and debug information
- **INFO**: General operational messages, API requests, successful operations (recommended for production)
- **WARN**: Warning conditions that don't prevent operation but should be monitored
- **ERROR**: Error conditions that affect functionality but don't crash the system
- **SECURITY**: Security-related events like failed authentication, rate limiting, suspicious activity
- **CRITICAL**: System-critical issues that require immediate attention (always logged regardless of level)

### Webhook Integration

When `WEBHOOK_URL` is configured, the following events trigger webhook notifications:
- Missing or invalid `SALT_HEX` configuration
- System startup failures
- Critical security events
- Application crashes or unhandled errors

The webhook payload includes structured information about the event, timestamp, and system context for rapid incident response. Compatible with Slack, Discord, Microsoft Teams, or any service that accepts JSON webhook payloads.

## Usage

### Web Interface

**Encryption Process:**
1. Open Salty in your web browser
2. Enter your plaintext message into the "Payload" textarea
3. Provide a strong key (passphrase) in the "Key" input field
4. Click "Go" (or "実行" in Japanese) to encrypt your message
5. Copy the encrypted cipher in your preferred format:
   - **Shareable cipher**: Formatted with BEGIN/END markers for readability
   - **Compressed version**: Continuous string for length-restricted contexts

**Decryption Process:**
1. Paste the Salty-encrypted message into the "Payload" textarea
2. Enter the exact same key used for encryption
3. Click "Go" (or "実行") to decrypt the message
4. The original plaintext will be displayed

### API Endpoints

The server provides RESTful API endpoints for programmatic encryption/decryption:

**Endpoint Configuration:**
- **Base URL**: `https://your-deployment-url.deno.dev/api/`
- **Method**: POST for both encrypt and decrypt
- **Content-Type**: `application/json` (required)
- **Authentication**: `X-API-Key` header (if API_KEY environment variable is set)

**Request Format:**
```json
{
  "payload": "text to encrypt OR basE91 cipher to decrypt",
  "key": "shared passphrase"
}
```

**Response Format:**
```json
{
  "success": true,
  "data": "encrypted basE91 string OR decrypted plaintext",
  "timestamp": "2025-06-23T12:00:00.000Z"
}
```

**Example Usage:**

*Encryption:*
```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-API-Key: YOUR_API_KEY" \
     -d '{"payload": "Hello, World!", "key": "mySecretKey"}' \
     https://your-deployment.deno.dev/api/encrypt
```

*Decryption:*
```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-API-Key: YOUR_API_KEY" \
     -d '{"payload": "basE91EncodedCiphertext", "key": "mySecretKey"}' \
     https://your-deployment.deno.dev/api/decrypt
```

### Database Integration & URL Pre-population

Salty supports workflow integration where encrypted payloads can be pre-populated via URL parameters:

**URL Format:**
```
https://your-deployment.deno.dev/en/?payload=ENCODED_CIPHER_TEXT
```

**Example Database Formula** (for proper URL encoding):
eSolia integrates Salty with our ops database, allowing users to enter a payload and key, then Encrypt and Decrypt to create a pre-built URL to send to our clients. The URL is populated as above, but the encoded cipher text must be URL encoded. The database's `URLEncode()` function does not produce a strict enough encoding, so we do some replacements prior to generating the URL, like so:

```
URLEncode(Replace(Replace(Replace(Replace(Replace(Replace([Encrypted Payload], "%", "%25"), ")", "%29"), "~", "%7E"), "\"", "%22"), "(", "%28"), "?", "%3F"))
```

**Security Workflow:**
1. Encrypt sensitive data using the API
2. Generate URL with payload parameter using database formula
3. Send URL via one communication channel (email)
4. Send key via separate secure channel (phone call, different email)
5. Recipient clicks URL, enters key, and decrypts message

### Health Monitoring

**Health Endpoint**: `GET /health`

Returns comprehensive system status including:
- Application version and build information
- Security configuration status
- Performance metrics and request statistics
- Environment validation results
- Crypto system availability

Example response includes server uptime, request success rates, security event summaries, and endpoint usage statistics.

## Security Architecture

### Defense in Depth

**Network Level:**
- HTTPS enforcement via Deno Deploy
- Rate limiting (20 requests/hour per IP)
- Request size limits (1MB payload, 1KB key)

**Application Level:**
- Input validation and sanitization
- SQL injection prevention through parameterized operations
- Cross-site scripting (XSS) protection via Content Security Policy

**Cryptographic Level:**
- Client-side encryption (server never sees plaintext)
- Industry-standard algorithms (AES-GCM, PBKDF2-SHA512)
- Cryptographically secure random number generation

### Security Headers

Comprehensive security headers implemented:
- **Content-Security-Policy**: Restrictive policy allowing only necessary resources
- **Strict-Transport-Security**: HSTS with subdomain inclusion
- **X-Content-Type-Options**: MIME type sniffing prevention
- **X-Frame-Options**: Clickjacking protection
- **X-XSS-Protection**: Browser XSS filter activation
- **Referrer-Policy**: Strict origin policy for referrer information

### Logging & Monitoring

**Security Event Tracking:**
- Failed authentication attempts
- Rate limit violations
- Input validation failures
- Suspicious activity patterns

**Performance Monitoring:**
- Request response times
- Endpoint usage statistics
- Error rates and patterns
- System resource utilization

## Important Security Notes

### Key Management
- **Strong Passphrases**: Use complex, unique keys for each encryption session
- **Secure Distribution**: Never transmit keys alongside encrypted data
- **Key Rotation**: Regularly update encryption keys for long-term usage

### Salt Security
- **Unique per Deployment**: Each Salty instance must use a unique SALT_HEX
- **Cryptographically Secure**: Generate salt using proper random number generators
- **Environment Protection**: Store salt securely in environment variables

### Client-Side Processing
- **Local Encryption**: All cryptographic operations occur in the user's browser
- **Server Independence**: Server never processes plaintext data (except via API endpoints)
- **Data Isolation**: No persistent storage of user data on server

### API Security
- **HTTPS Required**: All API communications must use HTTPS
- **API Key Protection**: Treat API keys as sensitive credentials
- **Input Validation**: Server validates all API inputs regardless of client validation

## Advanced Features

### Telemetry & Observability

The application includes comprehensive telemetry features:
- Custom span tracing for crypto operations
- Performance metric collection
- Security event correlation
- Request flow monitoring

### Version Management

Centralized version management system provides:
- Semantic versioning with build metadata
- Release notes and changelog tracking
- Runtime environment information
- Dependency version reporting

### Extensibility

The modular architecture supports:
- Custom logging backends
- Additional security middleware
- Extended telemetry integrations
- Alternative encoding schemes

## Contributing

Salty is an open-source project under the MIT License. Contributions are welcome:

1. **Fork the repository** and create a feature branch
2. **Follow TypeScript best practices** and maintain type safety
3. **Add appropriate tests** for new functionality
4. **Update documentation** for user-facing changes
5. **Submit a pull request** with clear description of changes

### Development Guidelines

- Maintain backward compatibility for API endpoints
- Follow existing code style and documentation patterns
- Ensure security features are not compromised by changes
- Test thoroughly across different browsers and environments

## License

This project is released under the MIT License. See the LICENSE file for complete details.

## Support & Documentation

- **Repository**: <https://github.com/esolia/salty.esolia.pro>
- **Live Application**: <https://salty.esolia.pro>
- **Company**: eSolia Inc. - <https://esolia.com>
- **Contact**: Professional support available through eSolia Inc.

---

**Built with ❤️ by eSolia Inc. - Tokyo-based IT Management and Support**