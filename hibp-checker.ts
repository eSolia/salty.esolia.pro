/**
 * hibp-checker.ts
 *
 * Have I Been Pwned password checker using k-Anonymity API
 * Checks if passwords have been exposed in data breaches
 *
 * Privacy-preserving: Only sends first 5 characters of SHA-1 hash
 */

export interface HIBPCheckResult {
  isCompromised: boolean;
  breachCount: number;
  error?: string;
}

/**
 * Cache for HIBP API responses to reduce API calls
 * Key: first 5 chars of SHA-1 hash, Value: response data with timestamp
 */
const hibpCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Convert string to SHA-1 hash using Web Crypto API
 *
 * NOTE: SHA-1 is intentionally used here as it's required by the HIBP API.
 * This is NOT a security vulnerability because:
 * 1. We're only using SHA-1 for API compatibility, not for security
 * 2. Only the first 5 characters are sent to HIBP (k-Anonymity)
 * 3. The full hash never leaves the client
 *
 * @devskim_disable: DS126858 - SHA-1 required for HIBP API compatibility
 */
// lgtm[js/weak-cryptographic-algorithm] - SHA-1 required by HIBP API
// codeql[js/weak-cryptographic-algorithm] - SHA-1 is required for HIBP API compatibility
async function sha1Hash(text: string): Promise<string> { // devskim: ignore DS126858
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data); // devskim: ignore DS126858 - SHA-1 required for HIBP API
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return hashHex.toUpperCase();
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Fetch hash suffixes from HIBP API using k-Anonymity
 */
async function fetchHashSuffixes(hashPrefix: string): Promise<string> {
  // Check cache first
  const cached = hibpCache.get(hashPrefix);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }

  const controller = new AbortController();
  // Fixed 5-second timeout for API calls - no user input involved
  // lgtm[js/arbitrary-code-injection] - Static timeout value, no user input
  const timeoutId = setTimeout(() => controller.abort(), 5000); // devskim: ignore - Static timeout, no user input

  try {
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${hashPrefix}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "Salty-Password-Checker",
          "Add-Padding": "true", // Request padded response for additional privacy
        },
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HIBP API error: ${response.status}`);
    }

    const data = await response.text();

    // Cache the response
    hibpCache.set(hashPrefix, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("HIBP API request timed out");
      }
      throw error;
    }
    throw new Error("Unknown error checking HIBP");
  }
}

/**
 * Parse HIBP API response and find matching hash
 */
function parseHIBPResponse(responseText: string, hashSuffix: string): number {
  const lines = responseText.split("\n");

  for (const line of lines) {
    const [suffix, count] = line.split(":");
    if (suffix === hashSuffix) {
      return parseInt(count, 10);
    }
  }

  return 0; // Not found in breach database
}

/**
 * Check if a password has been compromised in data breaches
 * Uses HIBP k-Anonymity API to preserve privacy
 */
export async function checkPasswordBreach(
  password: string,
): Promise<HIBPCheckResult> {
  try {
    // Don't check empty passwords
    if (!password) {
      return { isCompromised: false, breachCount: 0 };
    }

    // Generate SHA-1 hash of password
    const fullHash = await sha1Hash(password); // devskim: ignore DS126858 - SHA-1 required for HIBP API compatibility
    const hashPrefix = fullHash.substring(0, 5);
    const hashSuffix = fullHash.substring(5);

    // Fetch matching hashes from HIBP
    const responseText = await fetchHashSuffixes(hashPrefix);

    // Check if our hash suffix is in the response
    const breachCount = parseHIBPResponse(responseText, hashSuffix);

    return {
      isCompromised: breachCount > 0,
      breachCount,
    };
  } catch (error) {
    // Return error but don't block password usage
    return {
      isCompromised: false,
      breachCount: 0,
      error: error instanceof Error
        ? error.message
        : "Failed to check password breach status",
    };
  }
}

/**
 * Clear the HIBP cache (useful for testing or memory management)
 */
export function clearHIBPCache(): void {
  hibpCache.clear();
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getHIBPCacheStats(): { size: number; entries: string[] } {
  return {
    size: hibpCache.size,
    entries: Array.from(hibpCache.keys()),
  };
}
