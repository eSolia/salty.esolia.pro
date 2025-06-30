# Security Improvements Implementation

This document outlines the security improvements implemented in Salty to enhance its already strong security posture.

## 1. Subresource Integrity (SRI) and Security Attributes

### Status: ✅ Implemented

Added security attributes to all external resources in HTML files:

- `crossorigin="anonymous"` - Enables CORS for the resource
- `referrerpolicy="no-referrer"` - Prevents referrer information leakage

### Limitations

- Tailwind CSS and Font Awesome Kit use dynamic loading which doesn't support traditional SRI
- Comments added to HTML explaining these limitations
- For full SRI support, consider hosting these files locally

## 2. CORS Headers for API Endpoints

### Status: ✅ Implemented

Added comprehensive CORS support:

- Created `SecurityUtils.createCorsHeaders()` method
- Supports configurable allowed origins via `CORS_ALLOWED_ORIGINS` environment variable
- Default allowed origins: `https://salty.esolia.pro`, `http://localhost:8000`
- Handles OPTIONS preflight requests
- Applied to all API endpoints (`/api/encrypt`, `/api/decrypt`)

### Configuration

```bash
# Set custom allowed origins (comma-separated)
export CORS_ALLOWED_ORIGINS="https://salty.esolia.pro,https://app.example.com"
```

## 3. Security.txt Implementation

### Status: ✅ Implemented

Created RFC 9116-compliant security files:

- `/.well-known/security.txt` - Main security contact file
- `/.well-known/security-policy` - Detailed security policy

### Key Information

- Contact: admin@esolia.co.jp
- Expires: 2025-12-31T23:59:59.000Z
- Languages: English, Japanese
- Acknowledgments link to GitHub SECURITY.md

### Server Updates

- Added routing for `/.well-known/` directory
- Security checks prevent directory traversal
- Appropriate content-type headers
- 1-hour cache for security.txt files

## 4. Content Security Policy (CSP) Reporting

### Status: ✅ Implemented

Enhanced CSP with violation reporting:

- Added `report-uri` directive to CSP header
- Created `/api/csp-report` endpoint
- Added `Report-To` header for modern browser support
- CSP violations logged as security events

### Configuration

```bash
# Set custom CSP report endpoint (optional)
export CSP_REPORT_URI="/api/csp-report"
```

### Monitoring

CSP violations are logged with:

- Document URI where violation occurred
- Violated directive
- Blocked URI
- Line number and column
- Full security event tracking

## Summary

All security improvements have been successfully implemented, further strengthening Salty's security posture:

1. **External Resources**: Enhanced with security attributes (SRI limitations documented)
2. **API Security**: Full CORS support with configurable origins
3. **Security Disclosure**: RFC-compliant security.txt for responsible disclosure
4. **CSP Monitoring**: Real-time violation reporting for security monitoring

These improvements maintain backward compatibility and require no configuration changes to work with default settings.

## Environment Variables

New optional environment variables:

- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `CSP_REPORT_URI` - Custom endpoint for CSP reports (default: `/api/csp-report`)

## Testing

To verify the implementations:

```bash
# Test CORS headers
curl -I -H "Origin: https://salty.esolia.pro" https://salty.esolia.pro/api/encrypt

# Test security.txt
curl https://salty.esolia.pro/.well-known/security.txt

# Test CSP reporting (violation will be logged)
# Visit the site and inject invalid inline script via console
```
