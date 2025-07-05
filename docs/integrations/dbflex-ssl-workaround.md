# dbFLEX SSL Workaround Options

## Problem

Deno's built-in fetch is very strict about SSL/TLS configurations and rejects connections to dbFLEX's IIS server with the error:
```
Connection reset by peer (os error 104)
```

This is because Deno's fetch (based on Rust's reqwest) only accepts modern TLS configurations, while dbFLEX's IIS server uses broader compatibility settings.

## Solution Options

### Option 1: Proxy Service (Recommended)

Create a proxy service on a platform with more forgiving SSL handling:

#### Cloudflare Worker Example

1. Create a new Cloudflare Worker:

```javascript
export default {
  async fetch(request, env) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Verify the request is from your Salty instance
    const origin = request.headers.get('origin');
    if (origin !== 'https://salty.esolia.pro') {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const data = await request.json();
      
      // Forward to dbFLEX
      const response = await fetch(env.DBFLEX_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.DBFLEX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.text();
      
      return new Response(JSON.stringify({ 
        success: response.ok,
        status: response.status,
        data: result 
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://salty.esolia.pro',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
```

2. Set environment variables in Cloudflare:
   - `DBFLEX_URL`: Your full dbFLEX API URL
   - `DBFLEX_API_KEY`: Your dbFLEX API key

3. Update Salty's environment variables:
   ```
   DBFLEX_BASE_URL=https://your-worker.workers.dev
   DBFLEX_TABLE_URL=proxy
   DBFLEX_UPSERT_URL=
   ```

### Option 2: Client-Side Tracking

Modify the implementation to send tracking directly from the browser:

```javascript
// In templates/index.vto
async function trackLinkAccess() {
  const trackingId = getTrackingId();
  if (!trackingId) return;

  try {
    // Send directly to dbFLEX from browser
    const response = await fetch('https://pro.dbflex.net/secure/api/v2/15331/PS%20Secure%20Share/upsert.json?match=%CE%B5%20Id', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY', // Security risk!
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        "§ Id": `SALTY-${trackingId}`,
        "Last Accessed": new Date().toISOString(),
        "Last User Agent": navigator.userAgent,
        "Last User-Agent": parseUserAgent(navigator.userAgent),
        "Last Referrer": document.referrer || "direct"
      }]),
    });
  } catch (error) {
    console.debug("Tracking failed:", error);
  }
}
```

**⚠️ Security Issue**: This exposes your API key in client-side code!

### Option 3: Alternative Tracking Method

Instead of real-time tracking, batch process access logs:

1. Log access attempts locally in Salty
2. Periodically export logs
3. Import into dbFLEX using a different method

### Option 4: Server-Side Proxy Route

Add a Node.js microservice that Salty can call, which then forwards to dbFLEX using Node's more forgiving fetch.

## Recommendation

**Use Option 1 (Cloudflare Worker)** because:
- Keeps API key secure on server-side
- Minimal latency (Cloudflare's edge network)
- Easy to implement and maintain
- Free tier is sufficient for most use cases
- Works around Deno's SSL strictness

## Implementation Steps for Cloudflare Worker

1. Sign up for Cloudflare (free)
2. Create a new Worker
3. Paste the proxy code
4. Set environment variables
5. Deploy the Worker
6. Update Salty to point to your Worker URL
7. Test the tracking

The Worker acts as a bridge between Deno's strict SSL and dbFLEX's broader compatibility.