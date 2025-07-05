/**
 * Cloudflare Worker Proxy for Salty -> dbFLEX Integration
 * Uses shared secret authentication for server-to-server requests
 */

export default {
  async fetch(request, env) {
    // Only accept POST requests
    if (request.method === 'OPTIONS') {
      // Handle CORS preflight (in case browser needs it)
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Secret',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Check for shared secret authentication
    const providedSecret = request.headers.get('X-Proxy-Secret');
    const expectedSecret = env.PROXY_SECRET || 'default-secret-change-me';
    
    if (providedSecret !== expectedSecret) {
      console.log('Authentication failed - invalid proxy secret');
      return new Response(JSON.stringify({ 
        error: 'Forbidden',
        message: 'Invalid authentication'
      }), { 
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    try {
      // Parse the incoming request
      const data = await request.json();
      
      // Validate required fields
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid payload format');
      }
      
      // Log the request (visible in Cloudflare dashboard)
      console.log('Forwarding to dbFLEX:', JSON.stringify(data));
      
      // Forward to dbFLEX
      const dbflexResponse = await fetch(env.DBFLEX_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.DBFLEX_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      });

      // Get response text first to help with debugging
      const responseText = await dbflexResponse.text();
      
      // Log the response for debugging
      console.log('dbFLEX response:', dbflexResponse.status, responseText);
      
      // Return response to Salty
      return new Response(JSON.stringify({ 
        success: dbflexResponse.ok,
        status: dbflexResponse.status,
        message: dbflexResponse.ok ? 'Tracking recorded' : 'Failed to record tracking',
        debug: env.DEBUG === 'true' ? responseText : undefined
      }), {
        status: 200, // Always return 200 to Salty
        headers: { 
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 200, // Return 200 even on error so Salty gets the message
        headers: { 
          'Content-Type': 'application/json',
        },
      });
    }
  },
};