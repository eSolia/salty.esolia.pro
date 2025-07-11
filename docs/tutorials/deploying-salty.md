# Deploying Salty

In this tutorial, you'll learn how to deploy your own Salty instance. By the end, you'll have a secure password utility running on your infrastructure with proper security configurations.

## Prerequisites

- Deno runtime (1.40.0 or later)
- Git for cloning the repository
- A server or cloud platform for deployment
- Basic command-line knowledge
- SSL/TLS certificate for HTTPS

## What you'll learn

- How to clone and set up the Salty repository
- How to configure environment variables
- How to run Salty in development and production
- How to set up security configurations
- How to verify your deployment

## Step 1: Clone the Repository

First, clone the Salty repository to your server:

```bash
# Clone the repository
git clone https://github.com/esolia/salty.esolia.pro-dd.git

# Navigate to the project directory
cd salty.esolia.pro-dd
```

**Expected output:**
```
Cloning into 'salty.esolia.pro-dd'...
remote: Enumerating objects: 1234, done.
remote: Counting objects: 100% (1234/1234), done.
```

## Step 2: Install Dependencies

Salty uses Deno, which handles dependencies automatically. Verify Deno is installed:

```bash
# Check Deno version
deno --version
```

**Expected output:**
```
deno 1.40.0 (release, x86_64-apple-darwin)
v8 12.1.285.6
typescript 5.3.3
```

If Deno isn't installed, follow the [official installation guide](https://deno.land/manual/getting_started/installation).

## Step 3: Configure Environment Variables

Create your environment configuration:

```bash
# Copy the example environment file (if provided)
cp .env.example .env

# Or create a new .env file
touch .env
```

Edit the `.env` file with your configurations:

```bash
# Required: 32-character hex string (16 bytes)
SALT_HEX=0123456789abcdef0123456789abcdef

# Optional: API authentication
API_KEY=your-base64-encoded-api-key

# Optional: Logging configuration
LOG_LEVEL=INFO
LOG_FORMAT=json

# Optional: Critical alerts webhook
WEBHOOK_URL=https://your-webhook-endpoint.com/alerts

# Optional: Environment
NODE_ENV=production

# Optional: Admin dashboard authentication
DASH_USER=admin
DASH_PASS=secure-password-here
```

### Generating a Secure Salt

Generate a cryptographically secure salt:

```bash
# Using OpenSSL
openssl rand -hex 16

# Using Deno
deno eval "console.log(Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join(''))"
```

## Step 4: Run Development Server

Test your configuration in development mode:

```bash
# Run with file watching
deno task dev
```

**Expected output:**
```
🔐 Salty Password Utility v1.62.8
📍 Server running at http://localhost:8000
🌍 Environment: development
📊 Log level: INFO
✅ Health check: http://localhost:8000/health
```

Visit `http://localhost:8000` to verify the interface loads correctly.

## Step 5: Production Deployment

### Option A: Direct Deployment

For production, run without file watching:

```bash
# Set production environment
export NODE_ENV=production

# Run production server
deno task start
```

### Option B: Systemd Service (Linux)

Create a systemd service for automatic startup:

```bash
# Create service file
sudo nano /etc/systemd/system/salty.service
```

Add the following content:

```ini
[Unit]
Description=Salty Password Utility
After=network.target

[Service]
Type=simple
User=salty
WorkingDirectory=/opt/salty
Environment="SALT_HEX=your-32-char-hex-here"
Environment="NODE_ENV=production"
Environment="LOG_LEVEL=INFO"
ExecStart=/usr/local/bin/deno task start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable salty

# Start service
sudo systemctl start salty

# Check status
sudo systemctl status salty
```

### Option C: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM denoland/deno:1.40.0

WORKDIR /app

# Copy application files
COPY . .

# Cache dependencies
RUN deno cache server.ts

# Expose port
EXPOSE 8000

# Run application
CMD ["task", "start"]
```

Build and run:

```bash
# Build image
docker build -t salty .

# Run container
docker run -d \
  --name salty \
  -p 8000:8000 \
  -e SALT_HEX=your-32-char-hex-here \
  -e NODE_ENV=production \
  salty
```

## Step 6: Configure Reverse Proxy

For production, use a reverse proxy with SSL/TLS:

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name salty.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name salty.example.com;
    return 301 https://$server_name$request_uri;
}
```

## Step 7: Verify Deployment

### Check Health Endpoint

```bash
# Check health status
curl https://salty.example.com/health
```

**Expected response:**
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

### Test Security Headers

```bash
# Check security headers
curl -I https://salty.example.com
```

**Expected headers:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

## Step 8: Set Up Monitoring

### Enable Logging

Configure comprehensive logging:

```bash
# Set detailed logging
export LOG_LEVEL=DEBUG
export LOG_FORMAT=json

# Configure webhook for critical alerts
export WEBHOOK_URL=https://your-monitoring-service.com/webhook
```

### Monitor Key Metrics

Set up monitoring for:
- **Health endpoint**: Regular health checks
- **Rate limiting**: Monitor 429 responses
- **Error rates**: Track 4xx and 5xx errors
- **Performance**: Response times and CPU usage

## Summary

You've successfully deployed Salty with:
- ✓ Proper environment configuration
- ✓ Secure SALT_HEX generation
- ✓ Production-ready service setup
- ✓ SSL/TLS encryption
- ✓ Security headers configuration
- ✓ Health monitoring

## Security Checklist

Before going live, verify:
- [ ] SALT_HEX is unique and securely generated
- [ ] HTTPS is enforced (no HTTP access)
- [ ] Security headers are properly configured
- [ ] Rate limiting is active (20 requests/hour)
- [ ] Logs don't contain sensitive data
- [ ] API authentication is configured (if needed)
- [ ] Regular backups are configured
- [ ] Monitoring alerts are set up

## Next Steps

- Configure [API Authentication](../how-to/setup-api-auth.md)
- Set up [Security Monitoring](../how-to/monitor-telemetry.md)
- Review [Security Architecture](../explanation/security-architecture.md)
- Customize [Configuration Options](../reference/configuration.md)

## Troubleshooting

**Problem**: Server won't start
**Solution**: Check environment variables and Deno permissions

**Problem**: Rate limiting isn't working
**Solution**: Ensure `X-Forwarded-For` header is passed by reverse proxy

**Problem**: Can't access over HTTPS
**Solution**: Verify SSL certificates and reverse proxy configuration

**Problem**: High memory usage
**Solution**: This is normal due to PBKDF2 iterations; monitor and scale accordingly