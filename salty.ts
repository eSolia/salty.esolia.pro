/**
 * salty.ts - Fixed version with corrected basE91 implementation
 *
 * This file contains the core cryptographic functions for Salty.
 * It uses the Web Cryptography API (SubtleCrypto) for secure operations
 * like PBKDF2 for key derivation and AES-GCM for encryption/decryption.
 *
 * Fixed the basE91 encoding/decoding functions for proper compatibility.
 */

// Fixed basE91 encoding table - using the standard basE91 character set
const b91_enctab = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "!",
  "#",
  "$",
  "%",
  "&",
  "(",
  ")",
  "*",
  "+",
  ",",
  ".",
  "/",
  ":",
  ";",
  "<",
  "=",
  ">",
  "?",
  "@",
  "[",
  "]",
  "^",
  "_",
  "`",
  "{",
  "|",
  "}",
  "~",
  '"',
];

// Global constant for basE91 decoding table (derived from encoding table)
const b91_dectab = {};
b91_enctab.forEach((char, index) => {
  b91_dectab[char] = index;
});

/**
 * Converts a hexadecimal string to a Uint8Array.
 * @param hexString The hexadecimal string to convert.
 * @returns The resulting Uint8Array.
 */
export function hexToUint8Array(hexString: string): Uint8Array {
  // Ensure the hex string has an even length by padding with a leading zero if necessary.
  const normalizedHexString = hexString.length % 2 !== 0
    ? "0" + hexString
    : hexString;
  // Match every two characters and parse them as hexadecimal bytes.
  const matches = normalizedHexString.match(/.{1,2}/g);
  if (!matches) {
    throw new Error("Invalid hex string");
  }
  return Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
}

/**
 * Decodes a basE91 encoded string into a Uint8Array.
 * Fixed implementation based on the original basE91 specification.
 * @param data The basE91 encoded string.
 * @returns The decoded Uint8Array, or null if decoding fails.
 */
export function base91_decode(data: string): Uint8Array | null {
  if (!data || typeof data !== "string") {
    return null;
  }

  let v = -1;
  let b = 0;
  let n = 0;
  const output: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const c = b91_dectab[data[i]];
    if (c === undefined) {
      // Skip invalid characters
      continue;
    }

    if (v < 0) {
      v = c;
    } else {
      v += c * 91;
      b |= (v << n) & 0xFFFFFFFF; // Ensure 32-bit arithmetic
      n += (v & 8191) > 88 ? 13 : 14;

      do {
        output.push(b & 0xFF);
        b >>>= 8; // Unsigned right shift
        n -= 8;
      } while (n > 7);

      v = -1;
    }
  }

  if (v >= 0) {
    output.push((b | v << n) & 0xFF);
  }

  return output.length === 0 ? null : new Uint8Array(output);
}

/**
 * Encodes a Uint8Array into a basE91 string.
 * Fixed implementation based on the original basE91 specification.
 * @param data The Uint8Array to encode.
 * @returns The basE91 encoded string.
 */
export function base91_encode(data: Uint8Array): string {
  if (!data || data.length === 0) {
    return "";
  }

  let b = 0;
  let n = 0;
  let output = "";

  for (let i = 0; i < data.length; i++) {
    b |= (data[i] << n) & 0xFFFFFFFF; // Ensure 32-bit arithmetic
    n += 8;

    if (n > 13) {
      let v = b & 8191;
      if (v > 88) {
        b >>>= 13; // Unsigned right shift
        n -= 13;
      } else {
        v = b & 16383;
        b >>>= 14; // Unsigned right shift
        n -= 14;
      }
      output += b91_enctab[v % 91] + b91_enctab[Math.floor(v / 91)];
    }
  }

  if (n > 0) {
    output += b91_enctab[b % 91];
    if (n > 7 || b > 90) {
      output += b91_enctab[Math.floor(b / 91)];
    }
  }

  return output;
}

/**
 * Derives a cryptographic key from a passphrase using PBKDF2.
 * @param key The passphrase string.
 * @param saltHex The hexadecimal string representation of the salt.
 * @returns The derived CryptoKey.
 */
export async function salty_key(
  key: string,
  saltHex: string,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const password = enc.encode(key);
  const salt = hexToUint8Array(saltHex); // Convert hex salt to Uint8Array

  const iterations = 600000; // Number of PBKDF2 iterations (high for security)
  const hash = "SHA-512"; // Hashing algorithm
  const keyLen = 32; // Key length in bytes (256 bits for AES-GCM)

  // Import the password as a raw key for PBKDF2
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    password,
    { name: "PBKDF2" },
    false, // not extractable
    ["deriveBits", "deriveKey"], // usage
  );

  // Derive the actual encryption key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: hash,
    },
    passwordKey,
    { name: "AES-GCM", length: keyLen * 8 }, // AES-GCM with 256-bit key
    true, // extractable
    ["encrypt", "decrypt"], // usage
  );

  return derivedKey;
}

/**
 * Encrypts a message using AES-GCM with a derived cryptographic key.
 * @param message The plaintext message to encrypt.
 * @param cryptoKey The CryptoKey derived from the passphrase.
 * @returns The basE91 encoded ciphertext.
 */
export async function salty_encrypt(
  message: string,
  cryptoKey: CryptoKey,
): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(message); // Encode message to Uint8Array

  // Generate a random Initialization Vector (IV)
  const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM uses 12-byte IV

  // Encrypt the data
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
      tagLength: 128, // Authentication tag length in bits
    },
    cryptoKey,
    data,
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
 * @param encrypted The basE91 encoded ciphertext.
 * @param cryptoKey The CryptoKey derived from the passphrase.
 * @returns The decrypted plaintext message, or null if decryption fails.
 */
export async function salty_decrypt(
  encrypted: string,
  cryptoKey: CryptoKey,
): Promise<string | null> {
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
        name: "AES-GCM",
        iv: iv,
        tagLength: 128,
      },
      cryptoKey,
      ciphertextWithTag,
    );

    // Decode the decrypted buffer back to a string
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    // e.g., incorrect key, corrupted ciphertext
    return null;
  }
}
