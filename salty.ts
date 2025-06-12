/**
 * salty.ts
 *
 * This file contains the core encryption and decryption logic.
 *
 * Note: The original PHP salty.php uses `XSalsa20Poly1305` via libsodium.
 * This TypeScript implementation uses `AES-GCM` from the Web Crypto API.
 * Therefore, encrypted messages from this TypeScript version WILL NOT BE
 * compatible with the PHP version, and vice-versa.
 */

// This is a default salt value used if no environment variable is provided.
// In production, the Deno server will inject a different, securely stored value.
export const DEFAULT_SALT_HEX = '0E57CCD6AC0AF51DA4969E2A5DEF53C7';

/**
 * Converts a hex string to a Uint8Array.
 * @param hexString The hex string to convert.
 * @returns A Uint8Array representation.
 */
export function hexToUint8Array(hexString: string): Uint8Array {
  // Ensure the hex string is always even length by padding if necessary
  const normalizedHexString = hexString.length % 2 !== 0 ? '0' + hexString : hexString;
  return Uint8Array.from(normalizedHexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
}

// basE91 encoding/decoding tables
const b91_enctab = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '!', '#', '$',
  '%', '&', '(', ')', '*', '+', ',', '.', '/', ':', ';', '<', '=',
  '>', '?', '@', '[', ']', '^', '_', '`', '{', '|', '}', '~', '"'
];

const b91_dectab: { [key: string]: number } = {};
b91_enctab.forEach((char, index) => {
  b91_dectab[char] = index;
});

/**
 * Decodes a basE91 encoded string into a Uint8Array.
 * @param d The basE91 encoded string.
 * @returns A Uint8Array of the decoded data, or null if decoding fails.
 */
function base91_decode(d: string): Uint8Array | null {
  let n = 0;
  let b = 0;
  let o: number[] = [];
  let v = -1;
  const l = d.length;

  for (let i = 0; i < l; ++i) {
    const c = b91_dectab[d[i]];
    if (c === undefined) {
      continue;
    }
    if (v < 0) {
      v = c;
    } else {
      v += c * 91;
      b |= v << n;
      n += (v & 8191) > 88 ? 13 : 14;
      do {
        o.push(b & 0xFF);
        b >>= 8;
        n -= 8;
      } while (n > 7);
      v = -1;
    }
  }
  if (v + 1) {
    o.push((b | (v << n)) & 0xFF);
  }

  if (o.length === 0) {
    return null;
  }
  return new Uint8Array(o);
}


/**
 * Encodes a Uint8Array into a basE91 string.
 * @param d The Uint8Array to encode.
 * @returns The basE91 encoded string.
 */
function base91_encode(d: Uint8Array): string {
  let n = 0;
  let b = 0;
  let o = '';
  const l = d.length;

  for (let i = 0; i < l; ++i) {
    b |= d[i] << n;
    n += 8;
    if (n > 13) {
      let v = b & 8191;
      if (v > 88) {
        b >>= 13;
        n -= 13;
      } else {
        v = b & 16383;
        b >>= 14;
        n -= 14;
      }
      o += b91_enctab[v % 91] + b91_enctab[Math.floor(v / 91)];
    }
  }
  if (n) {
    o += b91_enctab[b % 91];
    if (n > 7 || b > 90) {
      o += b91_enctab[Math.floor(b / 91)];
    }
  }
  return o;
}

/**
 * Derives a cryptographic key from a password using PBKDF2.
 * @param key The user-provided string key/password.
 * @param saltHex The hex string for the salt. This should come from a secure source.
 * @returns A Promise that resolves to a CryptoKey.
 */
export async function salty_key(key: string, saltHex: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const password = enc.encode(key);
  const salt = hexToUint8Array(saltHex);

  const iterations = 600000;
  const hash = 'SHA-512';
  const keyLen = 32; // 32 bytes for AES-256

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    password,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: hash,
    },
    passwordKey,
    { name: 'AES-GCM', length: keyLen * 8 },
    true,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypts a message using AES-GCM and then basE91 encodes the result.
 * @param message The plaintext message as a string.
 * @param cryptoKey The CryptoKey derived from `salty_key`.
 * @returns A Promise that resolves to the basE91 encoded encrypted string.
 */
export async function salty_encrypt(message: string, cryptoKey: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(message);

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    cryptoKey,
    data
  );

  const fullCiphertext = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  fullCiphertext.set(iv, 0);
  fullCiphertext.set(new Uint8Array(ciphertext), iv.byteLength);

  const encoded = base91_encode(fullCiphertext);

  return encoded;
}

/**
 * Decrypts a basE91 encoded message using AES-GCM.
 * @param encrypted The basE91 encoded encrypted string.
 * @param cryptoKey The CryptoKey derived from `salty_key`.
 * @returns A Promise that resolves to the decrypted plaintext string, or null if decryption fails.
 */
export async function salty_decrypt(encrypted: string, cryptoKey: CryptoKey): Promise<string | null> {
  const decoded = base91_decode(encrypted);

  if (!decoded) {
    return null;
  }

  const minLength = 12 + 16;
  if (decoded.length < minLength) {
    return null;
  }

  const iv = decoded.slice(0, 12);
  const ciphertextWithTag = decoded.slice(12);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      cryptoKey,
      ciphertextWithTag
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (e) {
    // console.error("Decryption failed:", e); // For debugging
    return null;
  }
}
