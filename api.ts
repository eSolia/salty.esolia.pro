/**
 * api.ts
 *
 * This file sets up a Deno HTTP server to provide an API endpoint
 * for encrypting text, similar to the original script.php.
 *
 * To run this locally: deno run --allow-net --allow-read api.ts
 * To deploy to Deno Deploy: Push this file to your Deno Deploy project.
 *
 * Note: This API uses the salty.ts logic, meaning its encryption is NOT
 * compatible with the original PHP application's encryption.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Import cryptographic functions and the default SALT_HEX from salty.ts
// In a Deno Deploy project, ensure salty.ts is in the same directory or correctly path-referenced.
import { salty_key, salty_encrypt, DEFAULT_SALT_HEX } from "./salty.ts"; // Assuming salty.ts is in the same directory

console.log("Salty API server listening on http://localhost:8000/");

serve(async (req: Request) => {
  // Only allow POST requests for encryption
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Expecting application/json for payload and key
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return new Response('Content-Type must be application/json', { status: 400 });
  }

  // Retrieve SALT_HEX from environment variables.
  // For local development, it will fall back to DEFAULT_SALT_HEX from salty.ts.
  const saltHex = Deno.env.get('SALT_HEX') || DEFAULT_SALT_HEX;

  try {
    const { payload, key } = await req.json();

    if (typeof payload !== 'string' || typeof key !== 'string') {
      return new Response('Missing or invalid payload or key parameters.', { status: 400 });
    }

    // Pass the saltHex to salty_key
    const cryptoKey = await salty_key(key, saltHex);
    const encryptedText = await salty_encrypt(payload, cryptoKey);

    // Return as plain text, similar to script.php
    return new Response(encryptedText, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
});
