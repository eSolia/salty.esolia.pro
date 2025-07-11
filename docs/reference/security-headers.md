# Security Headers Reference

## Overview

Salty implements comprehensive security headers to protect against common web vulnerabilities. This reference documents all security headers, their values, and configurations.

## Synopsis

```
HTTP/1.1 200 OK
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: [policy]
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

## Description

Security headers are HTTP response headers that provide an additional layer of security by instructing browsers how to handle content. Salty implements these headers to prevent XSS, clickjacking, MIME sniffing, and other attacks.

## Headers

### `Strict-Transport-Security` {#hsts}

**Value**: `max-age=31536000; includeSubDomains`  
**Purpose**: Forces HTTPS connections for one year  
**Protection**: Man-in-the-middle attacks, protocol downgrade

Instructs browsers to only connect via HTTPS for the specified duration.

**Directives**:
- `max-age=31536000`: Remember for 1 year (31,536,000 seconds)
- `includeSubDomains`: Apply to all subdomains
- `preload`: (Optional) Request inclusion in browser preload lists

**Example**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### `Content-Security-Policy` {#csp}

**Value**: Complex policy (see below)  
**Purpose**: Controls resource loading  
**Protection**: XSS, injection attacks, unauthorized resources

Defines allowed sources for various content types.

**Default Policy**:
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

**Directives Explained**:
- `default-src 'self'`: Default to same-origin only
- `script-src 'self' 'unsafe-inline'`: Scripts from same-origin, inline allowed
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`: Styles with Google Fonts
- `font-src 'self' https://fonts.gstatic.com`: Fonts from self and Google
- `img-src 'self' data:`: Images from same-origin and data URIs
- `connect-src 'self'`: AJAX/WebSocket to same-origin only
- `frame-ancestors 'none'`: Prevent embedding in frames
- `base-uri 'self'`: Restrict `<base>` tag URLs
- `form-action 'self'`: Forms submit to same-origin only

### `X-Content-Type-Options` {#xcto}

**Value**: `nosniff`  
**Purpose**: Prevents MIME type sniffing  
**Protection**: MIME confusion attacks

Instructs browsers to strictly follow the declared Content-Type.

**Example**:
```
X-Content-Type-Options: nosniff
```

### `X-Frame-Options` {#xfo}

**Value**: `SAMEORIGIN`  
**Purpose**: Controls iframe embedding  
**Protection**: Clickjacking attacks

**Options**:
- `DENY`: Never allow framing
- `SAMEORIGIN`: Allow framing by same origin only
- `ALLOW-FROM uri`: Allow specific origin (deprecated)

**Example**:
```
X-Frame-Options: SAMEORIGIN
```

### `X-XSS-Protection` {#xxp}

**Value**: `1; mode=block`  
**Purpose**: Enables browser XSS filter  
**Protection**: Reflected XSS attacks

**Note**: Being phased out in favor of CSP, but still useful for older browsers.

**Options**:
- `0`: Disable XSS filter
- `1`: Enable XSS filter
- `1; mode=block`: Enable and block page on detection

**Example**:
```
X-XSS-Protection: 1; mode=block
```

### `Referrer-Policy` {#referrer}

**Value**: `strict-origin-when-cross-origin`  
**Purpose**: Controls referrer information  
**Protection**: Information leakage

**Options**:
- `no-referrer`: Never send referrer
- `same-origin`: Send referrer to same origin only
- `strict-origin`: Send origin only when protocol security level stays same
- `strict-origin-when-cross-origin`: Full URL same-origin, origin only cross-origin

**Example**:
```
Referrer-Policy: strict-origin-when-cross-origin
```

### `Permissions-Policy` {#permissions}

**Value**: `geolocation=(), microphone=(), camera=()`  
**Purpose**: Controls browser features  
**Protection**: Unauthorized feature access

Disables sensitive browser features.

**Example**:
```
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
```

## Implementation

### Server Configuration

Headers are set in the security middleware:

```typescript
// Applied to all responses
app.use((req, res, next) => {
  // Security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', cspPolicy);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

### Reverse Proxy Enhancement

When using a reverse proxy, additional headers can be added:

```nginx
# Nginx configuration
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Feature-Policy "geolocation none; midi none; sync-xhr none; microphone none; camera none; magnetometer none; gyroscope none; fullscreen self; payment none" always;
```

## Verification

### Using curl

Check headers with curl:

```bash
curl -I https://salty.example.com

# Check specific header
curl -I https://salty.example.com | grep -i "strict-transport"
```

### Using Security Tools

**Observatory by Mozilla**:
```bash
# Check online
https://observatory.mozilla.org/analyze/salty.example.com
```

**Security Headers Scanner**:
```bash
# Check online
https://securityheaders.com/?q=salty.example.com
```

### Automated Testing

```python
import requests

def test_security_headers(url):
    response = requests.get(url)
    headers = response.headers
    
    required_headers = {
        'Strict-Transport-Security': 'max-age=31536000',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': ['SAMEORIGIN', 'DENY'],
        'Content-Security-Policy': 'default-src'
    }
    
    for header, expected in required_headers.items():
        if header not in headers:
            print(f"❌ Missing: {header}")
        elif isinstance(expected, list):
            if not any(exp in headers[header] for exp in expected):
                print(f"❌ Invalid {header}: {headers[header]}")
            else:
                print(f"✅ {header}: {headers[header]}")
        elif expected not in headers[header]:
            print(f"❌ Invalid {header}: {headers[header]}")
        else:
            print(f"✅ {header}: {headers[header]}")

test_security_headers('https://salty.example.com')
```

## Common Issues

### CSP Violations

**Problem**: Resources blocked by CSP
**Solution**: Check browser console for violations, adjust policy carefully

**Debugging CSP**:
```javascript
// Add CSP report endpoint
Content-Security-Policy: default-src 'self'; report-uri /csp-report

// Log violations
app.post('/csp-report', (req, res) => {
  console.log('CSP Violation:', req.body);
  res.status(204).end();
});
```

### HSTS Issues

**Problem**: Can't access HTTP version during development
**Solution**: Use different domain or clear HSTS cache

**Clear HSTS in Chrome**:
```
chrome://net-internals/#hsts
```

### Frame Embedding

**Problem**: Need to embed Salty in iframe
**Solution**: Adjust X-Frame-Options to SAMEORIGIN or specific origin

**Conditional Framing**:
```typescript
// Allow specific origins
const allowedOrigins = ['https://trusted.example.com'];
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (allowedOrigins.includes(origin)) {
    res.setHeader('X-Frame-Options', `ALLOW-FROM ${origin}`);
  } else {
    res.setHeader('X-Frame-Options', 'DENY');
  }
  next();
});
```

## Security Score

Aim for an A+ security score by implementing:

1. ✅ All required security headers
2. ✅ HTTPS only with HSTS
3. ✅ Strict CSP policy
4. ✅ Modern TLS configuration
5. ✅ No unsafe inline scripts (when possible)

## Examples

### Minimal Secure Configuration

```typescript
// Minimum security headers
const minimalHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000'
};
```

### Maximum Security Configuration

```typescript
// Maximum security headers
const maximalHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};
```

## See also

- [How to Configure Security Settings](../how-to/configure-security.md) - Security configuration guide
- [Security Architecture](../explanation/security-architecture.md) - Overall security design
- [API Reference](./api.md) - API security features