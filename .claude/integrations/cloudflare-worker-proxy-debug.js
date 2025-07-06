/**
 * Cloudflare Worker Proxy for Salty -> dbFLEX Integration (DEBUG VERSION)
 * This version has extra logging to debug origin issues
 */

export default {
  async fetch(request, env) {
    // Log all requests
    console.log("Incoming request:", {
      method: request.method,
      url: request.url,
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      headers: Object.fromEntries(request.headers.entries()),
    });

    // Only accept POST requests
    if (request.method === "OPTIONS") {
      // Handle CORS preflight
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*", // Allow all origins for testing
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // TEMPORARILY DISABLE ORIGIN CHECK FOR DEBUGGING
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    console.log("Origin check - Origin:", origin, "Referer:", referer);

    // Comment out origin check for now
    /*
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://salty.esolia.pro';
    const isAllowed = origin === allowedOrigin ||
                     (referer && referer.startsWith(allowedOrigin));

    if (!isAllowed) {
      console.log('Origin check failed - Expected:', allowedOrigin);
      return new Response('Forbidden', {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Invalid origin' })
      });
    }
    */

    try {
      // Parse the incoming request
      const data = await request.json();

      // Validate required fields
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Invalid payload format");
      }

      // Log the request (visible in Cloudflare dashboard)
      console.log("Forwarding to dbFLEX:", JSON.stringify(data));

      // Forward to dbFLEX
      const dbflexResponse = await fetch(env.DBFLEX_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.DBFLEX_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(data),
      });

      // Get response text first to help with debugging
      const responseText = await dbflexResponse.text();

      // Log the response for debugging
      console.log("dbFLEX response:", dbflexResponse.status, responseText);

      // Return response to Salty
      return new Response(
        JSON.stringify({
          success: dbflexResponse.ok,
          status: dbflexResponse.status,
          message: dbflexResponse.ok
            ? "Tracking recorded"
            : "Failed to record tracking",
          debug: env.DEBUG === "true" ? responseText : undefined,
        }),
        {
          status: 200, // Always return 200 to Salty
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // Allow all for testing
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        },
      );
    } catch (error) {
      console.error("Worker error:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200, // Return 200 even on error so Salty gets the message
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // Allow all for testing
          },
        },
      );
    }
  },
};
