/**
 * Cloudflare Worker Proxy for Salty -> dbFLEX Integration
 * This worker bypasses Deno's strict SSL requirements
 */

export default {
  async fetch(request, env) {
    // Only accept POST requests
    if (request.method === "OPTIONS") {
      // Handle CORS preflight
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN ||
            "https://salty.esolia.pro",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Verify the request is from your Salty instance
    const origin = request.headers.get("origin");
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://salty.esolia.pro";

    // Check both origin header and referer for security
    const referer = request.headers.get("referer");
    // Parse URLs properly to avoid substring matching vulnerabilities
    let isAllowed = origin === allowedOrigin;
    if (!isAllowed && referer) {
      try {
        const refererUrl = new URL(referer);
        isAllowed = refererUrl.origin === allowedOrigin;
      } catch (_e) {
        // Invalid URL in referer
        isAllowed = false;
      }
    }

    if (!isAllowed) {
      return new Response("Forbidden", {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "Invalid origin" }),
      });
    }

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
            "Access-Control-Allow-Origin": allowedOrigin,
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
            "Access-Control-Allow-Origin": allowedOrigin,
          },
        },
      );
    }
  },
};
