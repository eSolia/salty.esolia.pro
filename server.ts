/**
 * server.ts
 *
 * This file sets up a Deno HTTP server to serve:
 * 1. The web UI (Japanese and English versions) by reading HTML files.
 * 2. The API endpoint for encryption/decryption requests.
 * 3. Static assets like JavaScript modules, CSS, and images.
 *
 * It retrieves the SALT_HEX and the API_KEY from Deno Deploy environment variables
 * to ensure secure and consistent operation.
 *
 * To run locally: deno run --allow-net --allow-read --allow-env server.ts
 * To deploy to Deno Deploy: Push this file to your Deno Deploy project
 * and set it as the entry point.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { dirname, fromFileUrl, join, extname } from "https://deno.land/std@0.224.0/path/mod.ts";

// Import cryptographic functions from salty.ts (used only by the API endpoint now)
import { salty_key, salty_encrypt, salty_decrypt, hexToUint8Array } from "./salty.ts";

// Determine the base directory of the script for reading static files
const currentDir = dirname(fromFileUrl(import.meta.url));

// --- Configuration ---
// Retrieve SALT_HEX from environment variables.
// In production on Deno Deploy, this *must* be set.
const SALT_HEX = Deno.env.get('SALT_HEX');
if (!SALT_HEX) {
  console.error("CRITICAL ERROR: Environment variable 'SALT_HEX' is not set.");
  console.error("Please set SALT_HEX in your Deno Deploy project settings (or locally for testing).");
  Deno.exit(1); // Exit if critical configuration is missing
}

// Retrieve API_KEY from environment variables.
// In production on Deno Deploy, this *must* be set for API access.
const API_KEY = Deno.env.get('API_KEY');
if (!API_KEY) {
  console.warn("WARNING: Environment variable 'API_KEY' is not set. API endpoint will not be authenticated.");
}

// Define a placeholder that will be replaced in the HTML template when served
const SALT_PLACEHOLDER = 'SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER';

/**
 * Reads an HTML file and injects the SALT_HEX into it.
 * @param {string} filePath The path to the HTML file relative to currentDir.
 * @returns {Promise<string>} The HTML content with the salt injected.
 */
async function getHtmlContent(filePath: string): Promise<string> {
  const fullPath = join(currentDir, filePath);
  let htmlContent = '';
  try {
    htmlContent = await Deno.readTextFile(fullPath);
    // Inject the SALT_HEX securely into the client-side JavaScript.
    htmlContent = htmlContent.replace(SALT_PLACEHOLDER, SALT_HEX);
  } catch (error) {
    console.error(`Error reading HTML file ${fullPath}:`, error);
    throw new Error('Failed to load HTML content.');
  }
  return htmlContent;
}

/**
 * Maps file extensions to MIME types.
 */
const MIME_TYPES: { [key: string]: string } = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ts': 'application/javascript', // Deno Deploy transpiles TS to JS
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

/**
 * Serves a static file (text or binary) from disk.
 * @param {string} requestPath The requested path (e.g., "/img/logo.png").
 * @returns {Promise<Response>} The Response object for the static file.
 */
async function serveStaticFile(requestPath: string): Promise<Response> {
  // Map request path to file system path. Remove leading slash for join.
  const filePath = join(currentDir, requestPath.substring(1));
  const fileExtension = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[fileExtension] || 'application/octet-stream'; // Default to binary stream

  try {
    let fileContent: string | Uint8Array;
    if (contentType.startsWith('text/') || contentType.includes('javascript') || contentType.includes('json') || contentType.includes('xml')) {
      fileContent = await Deno.readTextFile(filePath);
    } else {
      fileContent = await Deno.readFile(filePath); // Use readFile for binary data (images)
    }

    // For empty CSS or favicon, return 204 No Content as before
    if ((requestPath === '/style.css' || requestPath === '/favicon.ico') && fileContent.byteLength === 0) {
      return new Response(null, { status: 204, headers: { 'Content-Type': contentType + '; charset=utf-8' } });
    }

    return new Response(fileContent, {
      headers: { 'Content-Type': contentType + '; charset=utf-8' },
    });
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return new Response('Not Found', { status: 404 });
    }
    console.error(`Error serving static file ${filePath}:`, error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// --- Request Handler ---
console.log(`Salty server listening on http://localhost:8000/`);
console.log(`SALT_HEX from environment: ${SALT_HEX}`);
if (API_KEY) {
  console.log("API_KEY is set. API endpoint is authenticated.");
} else {
  console.log("API_KEY is NOT set. API endpoint is NOT authenticated.");
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    // Serve the Japanese UI
    if (pathname === '/') {
      const htmlContent = await getHtmlContent('index.html');
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Serve the English UI
    if (pathname === '/en/' || pathname === '/en') {
      const htmlContent = await getHtmlContent('en/index.html');
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Handle the API endpoint
    if (pathname === '/api/encrypt') {
      if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }

      // API Key Authentication
      if (API_KEY) { // Only check if API_KEY env var is actually set
        const receivedApiKey = req.headers.get('X-API-Key');
        if (!receivedApiKey || receivedApiKey !== API_KEY) {
          return new Response('Unauthorized: Invalid or missing API key', { status: 401 });
        }
      } else {
        console.warn("API_KEY environment variable not set. API endpoint is not authenticated (for local testing).");
      }

      // Expecting application/json for payload and key
      if (!req.headers.get('content-type')?.includes('application/json')) {
        return new Response('Content-Type must be application/json', { status: 400 });
      }

      const { payload, key } = await req.json();

      if (typeof payload !== 'string' || typeof key !== 'string') {
        return new Response('Missing or invalid payload or key parameters.', { status: 400 });
      }

      // Use the securely loaded SALT_HEX for API encryption
      const cryptoKey = await salty_key(key, SALT_HEX);
      const encryptedText = await salty_encrypt(payload, cryptoKey);

      return new Response(encryptedText, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Serve salty.ts module
    if (pathname === '/salty.ts') {
        return await serveStaticFile('/salty.ts');
    }

    // Serve style.css
    if (pathname === '/style.css') {
        return await serveStaticFile('/style.css');
    }

    // Handle favicon.ico
    if (pathname === '/favicon.ico') {
      return await serveStaticFile('/favicon.ico');
    }

    // NEW: Serve images from /img directory
    if (pathname.startsWith('/img/')) {
        return await serveStaticFile(pathname);
    }

    // Catch-all for unknown routes
    return new Response('Not Found', { status: 404 });

  } catch (error) {
    console.error("Request handling error:", error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
});
