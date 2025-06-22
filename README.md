# Salty: Browser-Native Secure Text Encryption

Salty (<https://salty.esolia.pro>) is a simple, web-based application designed for secure text encryption and decryption using a shared key. It leverages the browser's built-in Web Crypto API for robust cryptographic operations, ensuring that sensitive data is processed client-side. The application also employs basE91 encoding for portability, making the encrypted output suitable for various communication channels, including those with length limitations.

## Features

* Browser-Native Encryption: Utilizes the Web Crypto API for strong, client-side encryption (`AES-GCM`) and key derivation (`PBKDF2`).
* Shared Key Security: Securely encrypt and decrypt messages using a shared passphrase.
* Automatic Detection: Intelligently detects whether the input payload is plaintext (to be encrypted) or a Salty-encrypted cipher (to be decrypted).
* `basE91` Encoding: Encrypted output is encoded using `basE91`, providing a compact and portable format.
* Clipboard Integration: Easy one-click copying of encrypted or decrypted text to the clipboard.
* Responsive UI: Designed with Tailwind CSS for a clean and adaptive user experience across devices.
* Multi-language Support: Available in English and Japanese.

## Technologies Used

* Deno: Powers the server-side backend for serving static files and handling API requests (though core crypto is client-side).
* TypeScript: Used for type-safe JavaScript development.
* Web Crypto API: The browser's native cryptographic interface for secure operations.
* `basE91`: An efficient binary-to-text encoding scheme.
* HTML, CSS (Tailwind CSS): For structuring and styling the user interface.

## Security Confirmation

### Encryption & Key Derivation

**`salty_key()`**  

* PBKDF2 with SHA-512: ✅ Strong hash function.
* 600,000 iterations: ✅ Excellent for resisting brute-force attacks.
* 32-byte key (256-bit): ✅ Ideal for AES-GCM.

**`salty_encrypt()`**  

* AES-GCM with 12-byte IV: ✅ Correct and secure.
* IV is randomly generated: ✅ Good practice.
* Tag length 128 bits: ✅ Standard and secure.
* Concatenation of IV + ciphertext: ✅ Correct format for decryption.

### Decryption

**`salty_decrypt()`**  

* Properly extracts IV and ciphertext.
* Validates minimum length.
* Uses AES-GCM with correct parameters.
* Gracefully handles decryption errors.
* ✅ Well-structured and secure.

**`basE91 Encoding/Decoding`**  

* The encoding and decoding logic follows the original basE91 spec.
* The character tables are correctly defined.
* Bitwise operations and buffer handling are accurate.

## Getting Started
### Prerequisites

* [Deno](https://deno.land/manual/getting_started/installation) installed locally (for development/testing).
* A Deno Deploy account (for production deployment).
* A `SALT_HEX` environment variable set in your Deno Deploy project or local environment. This is a crucial cryptographic salt (a hex representation of 16 cryptographically secure random bytes).
* A base64 `API_KEY` stored in another environment variable in your Deno Deploy project and local environment, if you are going to use the encrypt and decrypt API. 

To generate a `SALT_HEX` (e.g. using Deno):

```ts
deno run -A -r https://deno.land/std@0.224.0/crypto/mod.ts -c crypto.getRandomValues --length 16 --format hex
```

Or, using `openssl`:

```bash
openssl rand -hex 16 | tr '[:lower:]' '[:upper:]'
```

You can generate a `base64` API key this way in Deno:

```ts
deno run --allow-read --allow-env --allow-run https://deno.land/std/node/crypto.ts -c "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Or, using `openssl`:

```bash
openssl rand -base64 32
```

The `openssl` versions are far simpler. Then, set the generated hex string as `SALT_HEX`, and the 32-bit base64 string as `API_KEY` in your Deno Deploy project settings.

### Project Structure

```
.
├── server.ts
├── salty.ts
├── index.html
├── en/
│   └── index.html
└── README.md
```

### Local Development

1. Clone the repository (or copy the files):
Ensure you have `server.ts`, `salty.ts`, `index.html`, and en/index.html in your project directory.

2. Set `SALT_HEX` environment variable:
For local testing, you can set it directly in your shell:

```bash
export SALT_HEX="YOUR_GENERATED_SALT_HEX_HERE"
```

(Replace with a salt generated using the command above).

3. Run the Deno server:

```
deno run --allow-net --allow-read --allow-env server.ts
```

4. Open your browser and navigate to <http://localhost:8000/> (for Japanese UI) or <http://localhost:8000/en/> (for English UI).

### Deployment to Deno Deploy

1. Create a new Deno Deploy project.
2. Link the project to your github repository `main` branch. 
3. Set the entry point for your Deno Deploy project to `server.ts`.
4. Configure Environment Variables: Go to your project settings in Deno Deploy and add an environment variable named `SALT_HEX` with the cryptographically secure hexadecimal salt value you generated. This is critical for the application's security.
 
## Usage

1. Open Salty in your web browser.
2. Enter your plaintext message into the "Payload" textarea.
3. Provide a strong key (passphrase) in the "Key" input field. This key is crucial for both encryption and decryption.
4. Click "Go" (or "実行") to encrypt your message. 
5. The encrypted cipher will be displayed in two formats:
   * Shareable cipher: Formatted with BEGIN/END markers and spaces for readability.
   * Compressed version: A continuous string without formatting, suitable for sharing in length-restricted contexts.
6. Use the "Copy" buttons to easily copy the generated cipher to your clipboard.

### Decryption

To decrypt a Salty-encrypted message:

1. Paste the Salty-encrypted message (including the BEGIN/END markers) into the "Payload" textarea. Salty will automatically detect it as an encrypted message.
2. Enter the exact same key that was used for encryption in the "Key" input field.
3. Click "Go" (or "実行") to decrypt the message. 
4. The original plaintext will be displayed.

### How to Use the `/api/encrypt` and `/api/decrypt` API Endpoints

These API endpoints in `server.ts` allow you to programmatically encrypt and decrypt data by sending a payload and a key to the server. It's distinct from the client-side encryption that happens directly in your browser when you use the web UI.

This API is useful if you need to integrate Salty's encryption capabilities into other backend systems or services, rather than solely relying on the browser UI.

1. Endpoint URL:
   * Method: POST
   * URL: <https://your-deno-deploy-url.deno.dev/api/encrypt> (or `/api/decrypt`)
      * Replace <https://your-deno-deploy-url.deno.dev> with the actual URL of your deployed Salty application.
2. Request Headers:
   * `Content-Type: application/json`
      * This header is mandatory because the API expects the request body to be in JSON format.
   * `X-API-Key: YOUR_API_KEY`
      * This header is mandatory for authentication if you have set the `API_KEY` environment variable in your Deno Deploy project. Replace `YOUR_API_KEY` with the actual API key you configured.
      * If you have not set the `API_KEY` environment variable, then this header is not required, but be aware that the endpoint will not be authenticated. This is generally only recommended for local development or highly controlled environments.

3. Request Body (JSON):
The request body must be a JSON object containing two properties:
* `payload`: The plaintext string you want to encrypt, or the `basE91`-encoded ciphertext to decrypt.
* `key`: The passphrase (string) that will be used to derive the cryptographic key, or that was used to encrypt the cleartext.

Example request body when encrypting: 

```json
{
  "payload": "My super secret message",
  "key": "123"
}
```

... and when decrypting: 

```json
{
  "payload": "v^0{<^0w@S...q+gGNeXSyM+>)7TIbq$s^B",
  "key": "123"
}
```

4. Responses
* Success (Status 200 OK):
   * The response will be the `basE91` encoded ciphertext as plain text. This is the "compressed version" of the encrypted output you see on the web UI.
* Error Responses:
   * 400 Bad Request: If Content-Type is not application/json, or if payload or key are missing/invalid in the JSON body.
   * 401 Unauthorized: If the X-API-Key header is missing or incorrect (and API_KEY is set in your environment variables).
   * 405 Method Not Allowed: If you use a method other than POST.
   * 500 Internal Server Error: For any server-side errors during processing.

5. Testing
Example `curl` commands for encrypt:

```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-API-Key: YOUR_ACTUAL_API_KEY" \
     -d '{"payload": "My super secret message", "key": "123"}' \
     https://your-deno-deploy-url.deno.dev/api/encrypt
```

... and decrypt:

```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-API-Key: YOUR_ACTUAL_API_KEY" \
     -d '{"payload": "v^0{<^0w@Sj%q...GNeXSyM+>)7TIbq$s^B", "key": "123"}' \
     https://your-deno-deploy-url.deno.dev/api/decrypt
```

### How to Pre-populate the Payload Text Box

If you prepare an URL using the url parameter `payload` with its value set to an url-encoded basE91 compact encrypted string, you can pre-populate the Payload text box. This makes it easy to send the encrypted string to a 3rd party, following up with the key in a separate email, or via a voice call. 

```
https://my-salty.deno.dev/?payload=yvC%22U0X64Xe.UUf4%...etc
https://my-salty.deno.dev/en/?payload=yvC%22U0X64Xe.UUf4%...etc
```

We use the API from an operations database to prepare a URL like this for sending a password to a client via one email, followed by another email with the key. 

One anomaly is, we discovered that certain `urlencode()` functions don't encode strictly enough for the function being used in javascript: `encodeURIComponent()`. If your `UrlEncode()` behaves like `encodeURIComponent()` in JavaScript, then it should already handle most of these characters correctly, but sometimes, a character will cause trouble. The telltale sign is, when you try to open the URL with the `payload` URL param, it won't populate. We fixed this by manually replacing `%` with `%25` before encoding, like so: 

```
URLEncode(Replace([Salty Encrypted Payload],"%","%25"))
```

If the `payload` URL param is not acting to pre-populate the payload text area, then you should check the string for `&, =, ?, #, +, ;, -, :` or quote marks, commas, backticks, and pre-replace them with their encoded equivalent as appropriate. 

## Important Security Notes
### General

* Key Management: The security of your encrypted messages relies entirely on the strength and secrecy of your key. Choose a strong, unique key and never share it insecurely.
* Salt: The `SALT_HEX` environment variable is essential for key derivation. It should be a truly random, unique value generated once per deployment. Do not reuse salts across different deployments or applications.
* Client-Side Processing: All encryption/decryption happens directly in your browser. The server only serves the application files and does not handle your plaintext or keys (unless you use the `/api/encrypt` endpoint, which is not actively used by the client-side UI for crypto operations in this setup, but exists for potential server-side use cases if implemented).

### API

* HTTPS is Crucial: Always ensure your API calls are made over HTTPS to prevent eavesdropping on your `payload`, `key`, and `X-API-Key`. Deno Deploy automatically enforces HTTPS.
* API Key Security: Treat your `API_KEY` environment variable as a sensitive secret. Never expose it in client-side code (e.g., JavaScript in your HTML). It should only be used from secure server-side applications or environments.
* Key Derivation: The server-side encryption also uses the `SALT_HEX` environment variable for key derivation, just like the client-side. Ensure this `SALT_HEX` is truly random and kept secret in your Deno Deploy environment variables.


## Contributing

Salty is an open-source project. Feel free to contribute by opening issues, suggesting features, or submitting pull requests on the GitHub repository.

## License

This project is released under the MIT License. See the LICENSE file for details.
