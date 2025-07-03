# Security Policy & Compliance

## 🛡️ Security Overview

Salty is designed with security as the primary focus, implementing defense-in-depth strategies and following industry best practices for cryptographic applications. This document outlines our security measures, compliance status, and responsible disclosure process.

## ✅ OWASP Top 10 Compliance

Salty has been assessed against the OWASP Top 10 (2021) security risks and demonstrates **full compliance** across all categories:

### A01: Broken Access Control ✅

- **Rate Limiting**: 20 requests/hour per IP address
- **API Authentication**: Optional API key protection with constant-time comparison
- **Path Traversal Protection**: Strict validation of static file paths
- **Access Restrictions**: Limited endpoints with explicit access controls

### A02: Cryptographic Failures ✅

- **Strong Algorithms**:
  - AES-GCM-256 for encryption
  - PBKDF2-SHA512 with 600,000 iterations for key derivation
  - 12-byte random IV using crypto.getRandomValues()
- **Key Management**:
  - Unique SALT_HEX per deployment
  - No hardcoded secrets
  - Environment variable configuration
- **Client-Side Encryption**: Server never processes plaintext data

### A03: Injection ✅

- **Input Validation**:
  - Payload size limit: 1MB
  - Key size limit: 1KB
  - Null byte sanitization
- **Content Type Validation**: Enforced application/json for API requests
- **HTML Escaping**: Proper output encoding in client-side code
- **No Dynamic Execution**: No eval() or Function() usage

### A04: Insecure Design ✅

- **Architecture**: Clean separation between crypto (client) and routing (server)
- **Fail-Safe Design**: Decryption failures return null without exposing details
- **Minimal Attack Surface**:
  - No database
  - No user accounts
  - Limited API endpoints
- **Stateless Design**: No session management vulnerabilities

### A05: Security Misconfiguration ✅

- **Security Headers**:
  ```
  Content-Security-Policy
  Strict-Transport-Security (HSTS)
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  ```
- **Environment Validation**: Required variables checked on startup
- **Error Handling**: Generic messages prevent information disclosure
- **Secure Defaults**: Production-ready configuration out of the box

### A06: Vulnerable and Outdated Components ✅

- **Minimal Dependencies**: Only Deno standard library
- **No npm Packages**: Reduced supply chain attack surface
- **Deno Runtime**: Secure-by-default with explicit permissions
- **Version Pinning**: All dependencies locked to specific versions

### A07: Identification and Authentication Failures ✅

- **API Key Protection**: When configured, validated on all API requests
- **No User Authentication**: Design eliminates account-based vulnerabilities
- **Rate Limiting**: Prevents brute force attacks
- **Stateless Architecture**: No session hijacking risks

### A08: Software and Data Integrity Failures ✅

- **Authenticated Encryption**: AES-GCM provides integrity verification
- **Version Tracking**: Git commit hash in version.ts
- **No Auto-Updates**: Static deployment prevents code injection
- **Health Monitoring**: /health endpoint verifies system integrity

### A09: Security Logging and Monitoring Failures ✅

- **Structured Logging**:
  - Category-based log levels
  - Security event tracking
  - No sensitive data in logs
- **Monitoring Features**:
  - Webhook alerts for critical events
  - Suspicious activity detection
  - Performance metrics collection
- **Audit Trail**: Comprehensive request logging with unique IDs

### A10: Server-Side Request Forgery (SSRF) ✅

- **No External Requests**: Server makes no outbound HTTP calls
- **Static Resources Only**: No dynamic resource fetching
- **Webhook Validation**: Optional webhook URL validated if configured
- **No User URLs**: Server doesn't process user-provided URLs

## 🔐 Cryptographic Specifications

### Encryption

- **Algorithm**: AES-GCM (Galois/Counter Mode)
- **Key Size**: 256-bit
- **IV Size**: 12 bytes (96 bits)
- **Authentication Tag**: 128-bit

### Key Derivation

- **Algorithm**: PBKDF2 (Password-Based Key Derivation Function 2)
- **Hash Function**: SHA-512
- **Iterations**: 600,000
- **Salt**: 16 bytes (server-configured)
- **Output**: 256-bit key

### Encoding

- **Format**: basE91
- **Purpose**: Compact, portable representation
- **Implementation**: Fixed bit operations for reliability

### SHA-1 Usage (HIBP Integration Only)

- **Purpose**: Have I Been Pwned API compatibility only
- **Scope**: Limited to password breach checking feature
- **Security Context**: NOT used for cryptographic security
- **Privacy Protection**: Only first 5 characters sent via k-Anonymity
- **Justification**: HIBP API requires SHA-1 for historical breach data compatibility
- **Risk Assessment**: No security impact as SHA-1 is not used for authentication or encryption

## 🚀 Security Features

### Client-Side Encryption

All cryptographic operations occur in the user's browser using the Web Crypto API. The server never has access to:

- Plaintext messages
- Encryption keys
- Decrypted content

### Defense in Depth

Multiple security layers protect the application:

1. **Network Level**: HTTPS enforcement, rate limiting
2. **Application Level**: Input validation, security headers
3. **Cryptographic Level**: Strong algorithms, secure random generation

### Security Monitoring

- Real-time security event tracking
- Suspicious activity detection
- Critical event webhook notifications
- Comprehensive audit logging

## 🔍 Security Testing

### Automated Security Scanning

Salty employs multiple automated security scanning tools:

1. **GitHub CodeQL**: Semantic code analysis for security vulnerabilities
   - Runs on every push and PR
   - Weekly scheduled scans
   - Covers JavaScript/TypeScript security patterns

2. **Microsoft DevSkim**: Security linter for source code
   - Identifies security anti-patterns
   - Runs on every push and PR
   - Weekly scheduled scans on Tuesdays

3. **Pattern Checker**: Custom security pattern detection
   - Scans for dangerous regex patterns (ReDoS)
   - Detects weak cryptographic usage
   - Identifies potential injection vulnerabilities

4. **Dependency Review**: Automated dependency vulnerability scanning
   - Runs on every PR
   - Checks for known vulnerabilities in dependencies
   - Enforced for all merges to main

5. **Security Test Suite**: Comprehensive security-focused tests
   - Cryptographic operation validation
   - Input validation testing
   - Attack scenario simulation

### Recommended Testing Procedures

1. **Input Validation Testing**:
   ```bash
   # Test oversized payloads
   curl -X POST https://your-domain/api/encrypt \
     -H "Content-Type: application/json" \
     -d '{"payload": "'$(python3 -c "print('A' * 1048577)")'"", "key": "test"}'
   ```

2. **Rate Limiting Verification**:
   ```bash
   # Send 21 requests to trigger rate limit
   for i in {1..21}; do
     curl -X POST https://your-domain/api/encrypt \
       -H "Content-Type: application/json" \
       -d '{"payload": "test", "key": "test"}'
   done
   ```

3. **Security Header Validation**:
   ```bash
   curl -I https://your-domain/
   ```

## 🐛 Responsible Disclosure

We take security seriously and appreciate responsible disclosure of vulnerabilities.

### Reporting Process

1. **Email**: admin@esolia.co.jp
2. **Subject**: "Salty Security Vulnerability"
3. **Include**:
   - Detailed description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested remediation (if any)

### Our Commitment

- Acknowledge receipt within 48 hours
- Provide updates on remediation progress
- Credit researchers (if desired) in release notes
- No legal action against good-faith researchers

### Out of Scope

- Denial of Service attacks
- Social engineering
- Physical attacks
- Attacks requiring privileged access

## 📊 Security Metrics

Our application tracks and monitors:

- Failed authentication attempts
- Rate limit violations
- Invalid input attempts
- Cryptographic operation failures
- Suspicious activity patterns

## 🏆 Compliance & Standards

- **OWASP Top 10 (2021)**: Full compliance
- **Cryptographic Standards**: NIST-approved algorithms
- **Logging Standards**: Structured logging following best practices
- **Security Headers**: A+ rating on securityheaders.com

## 📝 Security Changelog

### Version 2.2.0 (In Development)

- Added real-time password strength indicator
  - Client-side entropy calculation and feedback
  - Visual strength meter with color-coded levels (Very Weak to Strong)
  - Entropy-based crack time estimation
  - Pattern detection for common weak passwords
  - Improvement suggestions in both English and Japanese
  - Pure functional implementation following security best practices
  - No password data sent to server - all analysis done in browser
  - Helps users create stronger passwords to protect encrypted content

- Added Have I Been Pwned (HIBP) password breach checking
  - Privacy-preserving k-Anonymity API implementation
  - Only first 5 characters of SHA-1 hash sent to HIBP API
  - Client-side SHA-1 hashing using Web Crypto API
  - Real-time breach detection with debouncing (500ms delay)
  - Shows breach count when password is compromised
  - Cached API responses for performance (1-hour cache)
  - Graceful error handling - doesn't block password usage
  - Loading state indicator during API checks
  - Bilingual breach warnings (English and Japanese)
  - No plaintext passwords ever leave the browser

### Version 2.1.0

- Added QR code generation feature for secure content sharing
  - QR codes generated entirely client-side using qrcode-generator library
  - No sensitive data sent to external services
  - Updated Content Security Policy to allow cdn.jsdelivr.net for QR library
  - QR codes encode only the shareable URL (same as displayed to user)
- Fixed console.log information disclosure in server.ts
  - Replaced debug console.log statements with proper logger calls
  - Debug logs now respect LOG_LEVEL environment variable
- Enhanced sharing capabilities
  - Shareable URLs with encoded ciphertext for easy distribution
  - Maintains zero-knowledge architecture (keys never in URLs)

### Version 2.0.0

- Added comprehensive security validation utilities (security-utils.ts)
  - Input validation functions for XSS, SQL injection, path traversal prevention
  - Shell metacharacter detection
  - Base91 and hex validation
  - URL and content-type validation
  - Built-in rate limiting capabilities
- Implemented security-focused test suites
  - Cryptographic security tests (timing attacks, edge cases, ReDoS)
  - Validation function tests with attack scenarios
- Added GitHub Actions security workflows
  - CodeQL semantic analysis (weekly + on push/PR)
  - Microsoft DevSkim security linter (weekly + on push/PR)
  - Dependency vulnerability scanning
  - Daily security test runs
- Created pattern checker script for dangerous code patterns
  - ReDoS vulnerability detection
  - Weak cryptographic usage detection
  - Injection vulnerability identification
- Enhanced logger with security audit trail
  - Security event tracking with risk scoring
  - Audit log export for compliance
  - Suspicious activity detection improvements
- Added security configuration interface (security-config.ts)
  - Centralized security settings
  - Environment-based configurations
  - Strict mode options
- Implemented SECURITY-INSIGHTS.yml for machine-readable security practices
- Configured Dependabot for automated dependency updates
- Added security.txt and security policy files in .well-known

### Version 1.3.0

- Enhanced security logging with webhook notifications
- Improved rate limiting accuracy
- Added suspicious activity detection

### Version 1.2.0

- Implemented comprehensive security headers
- Added structured logging system
- Enhanced input validation

### Version 1.1.0

- Initial security implementation
- OWASP Top 10 compliance achieved

---

**Last Security Review**: 2025-06-30\
**Next Scheduled Review**: 2025-09-30\
**Security Contact**: admin@esolia.co.jp
