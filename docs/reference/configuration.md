# Configuration Reference

## Overview

Salty is configured through environment variables. This reference documents all available configuration options, their types, default values, and usage.

## Synopsis

```bash
export VARIABLE_NAME=value
deno task start
```

## Description

All Salty configuration is managed through environment variables. This approach ensures secure configuration management, easy deployment across different environments, and compatibility with container orchestration systems.

## Required Variables

### `SALT_HEX` {#salt-hex}

**Type**: `string`  
**Format**: 32-character hexadecimal string (16 bytes)  
**Required**: Yes  
**Environment variable**: `SALT_HEX`

The cryptographic salt used for key derivation. This value must be exactly 32 hexadecimal characters (0-9, a-f) representing 16 bytes of data.

**Example**:
```bash
export SALT_HEX=0123456789abcdef0123456789abcdef
```

**Generating a secure value**:
```bash
# Using OpenSSL
openssl rand -hex 16

# Using Deno
deno eval "console.log(Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join(''))"
```

## Optional Variables

### `API_KEY` {#api-key}

**Type**: `string`  
**Format**: Base64-encoded string  
**Default**: `undefined` (API authentication disabled)  
**Environment variable**: `API_KEY`

When set, requires all API requests to include this key in the `X-API-Key` header.

**Example**:
```bash
export API_KEY=$(openssl rand -base64 32)
```

### `LOG_LEVEL` {#log-level}

**Type**: `string`  
**Default**: `INFO`  
**Environment variable**: `LOG_LEVEL`  
**Valid values**: `DEBUG`, `INFO`, `WARN`, `ERROR`, `SECURITY`, `CRITICAL`

Controls the verbosity of application logging. Levels are hierarchical - each level includes all higher severity levels.

**Level descriptions**:
- `DEBUG`: Detailed debugging information, including telemetry
- `INFO`: General information about application operation
- `WARN`: Warning messages for potential issues
- `ERROR`: Error messages for failures
- `SECURITY`: Security-related events only
- `CRITICAL`: Critical errors requiring immediate attention

**Example**:
```bash
export LOG_LEVEL=SECURITY
```

### `LOG_FORMAT` {#log-format}

**Type**: `string`  
**Default**: `json`  
**Environment variable**: `LOG_FORMAT`  
**Valid values**: `json`, `text`

Determines the output format for log messages.

**Formats**:
- `json`: Structured JSON logs for parsing and analysis
- `text`: Human-readable text format for development

**Example**:
```bash
export LOG_FORMAT=json
```

### `WEBHOOK_URL` {#webhook-url}

**Type**: `string`  
**Format**: Valid HTTPS URL  
**Default**: `undefined` (webhook notifications disabled)  
**Environment variable**: `WEBHOOK_URL`

URL for sending critical alerts and security events. Must be an HTTPS endpoint that accepts POST requests with JSON payloads.

**Example**:
```bash
export WEBHOOK_URL=https://alerts.example.com/salty-webhook
```

**Webhook payload format**:
```json
{
  "timestamp": "2024-03-20T12:00:00.000Z",
  "level": "CRITICAL",
  "message": "Security event detected",
  "category": "security",
  "details": {
    "event": "rate_limit_exceeded",
    "ip": "192.168.1.100",
    "count": 50
  }
}
```

### `NODE_ENV` {#node-env}

**Type**: `string`  
**Default**: `development`  
**Environment variable**: `NODE_ENV`  
**Valid values**: `development`, `staging`, `production`

Sets the application environment, affecting logging verbosity and error handling.

**Environment behaviors**:
- `development`: Verbose logging, detailed errors
- `staging`: Moderate logging, sanitized errors
- `production`: Minimal logging, generic errors

**Example**:
```bash
export NODE_ENV=production
```

### `DASH_USER` {#dash-user}

**Type**: `string`  
**Default**: `undefined` (dashboard authentication disabled)  
**Environment variable**: `DASH_USER`

Username for admin dashboard authentication. Must be used with `DASH_PASS`.

**Example**:
```bash
export DASH_USER=admin
```

### `DASH_PASS` {#dash-pass}

**Type**: `string`  
**Default**: `undefined` (dashboard authentication disabled)  
**Environment variable**: `DASH_PASS`

Password for admin dashboard authentication. Must be used with `DASH_USER`.

**Example**:
```bash
export DASH_PASS=$(openssl rand -base64 24)
```

### `PORT` {#port}

**Type**: `number`  
**Default**: `8000`  
**Environment variable**: `PORT`  
**Valid values**: `1-65535`

The port number on which the server listens.

**Example**:
```bash
export PORT=3000
```

### `HOST` {#host}

**Type**: `string`  
**Default**: `0.0.0.0`  
**Environment variable**: `HOST`

The network interface to bind to.

**Common values**:
- `0.0.0.0`: Listen on all interfaces
- `127.0.0.1`: Listen on localhost only
- Specific IP: Bind to specific network interface

**Example**:
```bash
export HOST=127.0.0.1
```

## Configuration Files

### Using .env Files

For local development, you can use a `.env` file:

```bash
# .env file
SALT_HEX=0123456789abcdef0123456789abcdef
API_KEY=your-base64-api-key
LOG_LEVEL=INFO
LOG_FORMAT=json
NODE_ENV=development
```

Load with a shell script:
```bash
#!/bin/bash
set -a
source .env
set +a
deno task start
```

### Docker Configuration

When using Docker, pass environment variables:

```bash
docker run -d \
  -e SALT_HEX=0123456789abcdef0123456789abcdef \
  -e NODE_ENV=production \
  -e LOG_LEVEL=INFO \
  -e API_KEY=your-api-key \
  -p 8000:8000 \
  salty:latest
```

Or use an env file:
```bash
docker run -d --env-file production.env -p 8000:8000 salty:latest
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: salty-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "INFO"
  LOG_FORMAT: "json"
---
apiVersion: v1
kind: Secret
metadata:
  name: salty-secrets
type: Opaque
data:
  SALT_HEX: MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=
  API_KEY: eW91ci1iYXNlNjQtYXBpLWtleQ==
```

## Configuration Profiles

### Development Profile
```bash
export SALT_HEX=devsalt0123456789abcdef0123456789
export NODE_ENV=development
export LOG_LEVEL=DEBUG
export LOG_FORMAT=text
export PORT=8000
```

### Production Profile
```bash
export SALT_HEX=$(openssl rand -hex 16)
export NODE_ENV=production
export LOG_LEVEL=INFO
export LOG_FORMAT=json
export API_KEY=$(openssl rand -base64 32)
export WEBHOOK_URL=https://monitoring.example.com/alerts
```

### High-Security Profile
```bash
export SALT_HEX=$(openssl rand -hex 16)
export NODE_ENV=production
export LOG_LEVEL=SECURITY
export LOG_FORMAT=json
export API_KEY=$(openssl rand -base64 32)
export WEBHOOK_URL=https://siem.example.com/critical
export DASH_USER=secadmin
export DASH_PASS=$(openssl rand -base64 32)
```

## Validation

Salty validates configuration on startup:

1. **SALT_HEX validation**:
   - Must be exactly 32 characters
   - Must contain only hexadecimal characters (0-9, a-f)
   - Cannot be a weak value (all zeros, sequential, etc.)

2. **Port validation**:
   - Must be a valid port number (1-65535)
   - Must be available for binding

3. **URL validation**:
   - WEBHOOK_URL must be a valid HTTPS URL
   - Must be reachable (connection test)

4. **Credential validation**:
   - DASH_USER and DASH_PASS must both be set or both unset
   - API_KEY must be valid Base64 if set

## Environment-Specific Notes

### Heroku
```bash
heroku config:set SALT_HEX=$(openssl rand -hex 16)
heroku config:set NODE_ENV=production
heroku config:set LOG_LEVEL=INFO
```

### AWS ECS
```json
{
  "family": "salty-task",
  "containerDefinitions": [{
    "name": "salty",
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "LOG_LEVEL", "value": "INFO"}
    ],
    "secrets": [
      {"name": "SALT_HEX", "valueFrom": "arn:aws:secretsmanager:region:account:secret:salt-hex"},
      {"name": "API_KEY", "valueFrom": "arn:aws:secretsmanager:region:account:secret:api-key"}
    ]
  }]
}
```

### Google Cloud Run
```bash
gcloud run deploy salty \
  --set-env-vars="NODE_ENV=production,LOG_LEVEL=INFO" \
  --set-secrets="SALT_HEX=salt-hex:latest,API_KEY=api-key:latest"
```

## See also

- [How to Configure Security Settings](../how-to/configure-security.md) - Security configuration guide
- [API Reference](./api.md) - API endpoints and authentication
- [Deploying Salty](../tutorials/deploying-salty.md) - Deployment instructions