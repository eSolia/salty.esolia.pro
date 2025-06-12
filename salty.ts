/**
 * salty.ts
 *
 * This file contains the core cryptographic functions for Salty.
 * It uses the Web Cryptography API (SubtleCrypto) for secure operations
 * like PBKDF2 for key derivation and AES-GCM for encryption/decryption.
 *
 * It also includes the basE91 encoding/decoding functions for portability.
 */

// Global constant for basE91 encoding table
const b91_enctab = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '!', '#', '$',
  '%', '&', '(', ')', '*', '+', ',', '.', '/', ':', ';', '<', '=',
  '>', '?', '@', '[', ']', '^', '_', String.fromCharCode(96), '{', '|', '}', '~', '"'
];

// Global constant for basE91 decoding table (derived from encoding table)
const b91_dectab: { [key: string]: number } = {};
b91_enctab.forEach((char, index) => {
  b91_dectab[char] = index;
});

/**
 * Converts a hexadecimal string to a Uint8Array.
 * @param {string} hexString The hexadecimal string to convert.
 * @returns {Uint8Array} The resulting Uint8Array.
 */
export function hexToUint8Array(hexString: string): Uint8Array {
  // Ensure the hex string has an even length by padding with a leading zero if necessary.
  const normalizedHexString = hexString.length % 2 !== 0 ? '0' + hexString : hexString;
  // Match every two characters and parse them as hexadecimal bytes.
  return Uint8Array.from(normalizedHexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
}

/**
 * Decodes a basE91 encoded string into a Uint8Array.
 * Based on the original basE91 implementation logic.
 * @param {string} d The basE91 encoded string.
 * @returns {Uint8Array | null} The decoded Uint8Array, or null if decoding fails.
 */
export function base91_decode(d: string): Uint8Array | null {
  let n = 0; // bit shift counter
  let b = 0; // bit buffer
  let o: number[] = []; // output byte array
  let v = -1; // current value (from character pair)
  const l = d.length;

  for (let i = 0; i < l; ++i) {
    const c = b91_dectab[d[i]]; // get character's value from decode table
    if (c === undefined) continue; // skip invalid characters

    if (v < 0) {
      v = c; // first character of a pair
    } else {
      v += c * 91; // second character of a pair; compute value
      b |= v << n; // add value to bit buffer
      n += (v & 8191) > 88 ? 13 : 14; // adjust bit shift based on value
      do {
        o.push(b & 0xFF); // push byte to output
        b >>= 8; // shift buffer
        n -= 8; // decrease bit count
      } while (n > 7);
      v = -1; // reset value for next pair
    }
  }

  if (v + 1) { // if there's a remaining character
    o.push((b | (v << n)) & 0xFF); // add remaining bits to output
  }

  // Return null if no bytes were decoded (e.g., empty or invalid input)
  return o.length === 0 ? null : new Uint8Array(o);
}

/**
 * Encodes a Uint8Array into a basE91 string.
 * Based on the original basE91 implementation logic.
 * @param {Uint8Array} d The Uint8Array to encode.
 * @returns {string} The basE91 encoded string.
 */
export function base91_encode(d: Uint8Array): string {
  let n = 0; // bit shift counter
  let b = 0; // bit buffer
  let o = ''; // output string
  const l = d.length;

  for (let i = 0; i < l; ++i) {
    b |= d[i] << n; // add byte to bit buffer
    n += 8; // increase bit count
    if (n > 13) { // if enough bits for a character pair
      let v = b & 8191; // get 13 bits
      if (v > 88) { // if value is greater than 88, use 13 bits
        b >>= 13;
        n -= 13;
      } else { // otherwise use 14 bits
        v = b & 16383; // get 14 bits
        b >>= 14;
        n -= 14;
      }
      o += b91_enctab[v % 91] + b91_enctab[Math.floor(v / 91)]; // append encoded characters
    }
  }

  if (n) { // if there are remaining bits
    o += b91_enctab[b % 91]; // append first character
    if (n > 7 || b > 90) { // if more than 7 bits or value > 90, append second character
      o += b91_enctab[Math.floor(b / 91)];
    }
  }
  return o;
}

/**
 * Derives a cryptographic key from a passphrase using PBKDF2.
 * @param {string} key The passphrase string.
 * @param {string} saltHex The hexadecimal string representation of the salt.
 * @returns {Promise<CryptoKey>} The derived CryptoKey.
 */
export async function salty_key(key: string, saltHex: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const password = enc.encode(key);
  const salt = hexToUint8Array(saltHex); // Convert hex salt to Uint8Array

  const iterations = 600000; // Number of PBKDF2 iterations (high for security)
  const hash = 'SHA-512'; // Hashing algorithm
  const keyLen = 32; // Key length in bytes (256 bits for AES-GCM)

  // Import the password as a raw key for PBKDF2
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    password,
    { name: 'PBKDF2' },
    false, // not extractable
    ['deriveBits', 'deriveKey'] // usage
  );

  // Derive the actual encryption key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: hash,
    },
    passwordKey,
    { name: 'AES-GCM', length: keyLen * 8 }, // AES-GCM with 256-bit key
    true, // extractable
    ['encrypt', 'decrypt'] // usage
  );

  return derivedKey;
}

/**
 * Encrypts a message using AES-GCM with a derived cryptographic key.
 * @param {string} message The plaintext message to encrypt.
 * @param {CryptoKey} cryptoKey The CryptoKey derived from the passphrase.
 * @returns {Promise<string>} The basE91 encoded ciphertext.
 */
export async function salty_encrypt(message: string, cryptoKey: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(message); // Encode message to Uint8Array

  // Generate a random Initialization Vector (IV)
  const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM uses 12-byte IV

  // Encrypt the data
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // Authentication tag length in bits
    },
    cryptoKey,
    data
  );

  // Concatenate IV and ciphertext for storage/transmission
  const fullCiphertext = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  fullCiphertext.set(iv, 0);
  fullCiphertext.set(new Uint8Array(ciphertext), iv.byteLength);

  // Encode the combined IV+ciphertext using basE91
  return base91_encode(fullCiphertext);
}

/**
 * Decrypts a basE91 encoded ciphertext using AES-GCM with a derived cryptographic key.
 * @param {string} encrypted The basE91 encoded ciphertext.
 * @param {CryptoKey} cryptoKey The CryptoKey derived from the passphrase.
 * @returns {Promise<string | null>} The decrypted plaintext message, or null if decryption fails.
 */
export async function salty_decrypt(encrypted: string, cryptoKey: CryptoKey): Promise<string | null> {
  const decoded = base91_decode(encrypted); // Decode from basE91

  // Check minimum length: IV (12 bytes) + GCM Tag (16 bytes)
  if (!decoded || decoded.length < 12 + 16) {
    return null; // Invalid ciphertext length
  }

  const iv = decoded.slice(0, 12); // Extract IV
  const ciphertextWithTag = decoded.slice(12); // Extract ciphertext with authentication tag

  try {
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      cryptoKey,
      ciphertextWithTag
    );

    // Decode the decrypted buffer back to a string
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    // Log any decryption errors (e.g., incorrect key, corrupted ciphertext)
    console.error("Decryption failed:", e);
    return null;
  }
}
