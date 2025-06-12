/**
 * server.ts
 *
 * This file sets up a Deno HTTP server to serve both the web UI
 * (Japanese and English versions) and the API endpoint for encryption.
 *
 * It retrieves the SALT_HEX and the API_KEY from Deno Deploy environment variables
 * to ensure secure and consistent operation.
 *
 * To run locally: deno run --allow-net --allow-read server.ts
 * To deploy to Deno Deploy: Push this file to your Deno Deploy project
 * and set it as the entry point.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

// Import cryptographic functions from salty.ts
import { salty_key, salty_encrypt, salty_decrypt, hexToUint8Array } from "./salty.ts";

// --- Configuration ---
// Retrieve SALT_HEX from environment variables.
// In production on Deno Deploy, this *must* be set.
const SALT_HEX = Deno.env.get('SALT_HEX');
if (!SALT_HEX) {
  console.error("CRITICAL ERROR: Environment variable 'SALT_HEX' is not set.");
  console.error("Please set SALT_HEX in your Deno Deploy project settings (or locally for testing).");
  Deno.exit(1); // Exit if critical configuration is missing
}
const SALT_BYTES = hexToUint8Array(SALT_HEX); // Although not directly used here, good practice to show conversion for SALT.

// Retrieve API_KEY from environment variables.
// In production on Deno Deploy, this *must* be set for API access.
const API_KEY = Deno.env.get('API_KEY');
if (!API_KEY) {
  console.warn("WARNING: Environment variable 'API_KEY' is not set. API endpoint will not be authenticated.");
  // For production, you might want to Deno.exit(1) here too.
  // For now, I'll allow it to run without authentication for local testing flexibility,
  // but strongly recommend setting it in production.
}


// Define a placeholder that will be replaced in the HTML template
const SALT_PLACEHOLDER = 'SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER';

// --- HTML Templates (Inlined for simplicity for Deno Deploy) ---
// In a larger application, these would be separate .html files
// read from disk and processed as templates.

const HTML_TEMPLATE_JP = `<!DOCTYPE html>
<html lang="ja">
<head>
<title>Salty: NaClを利用したテキスト暗号化</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:title" content="Salty: Portable NaCl-powered text encryption">
<meta property="og:url" content="https://salty.esolia.pro/">
<meta property="og:description" content="Portable NaCl-powered text encryption">
<link rel="stylesheet" type="text/css" href="/style.css?v=20240730a">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://kit.fontawesome.com/99c1e8e2fb.js" crossorigin="anonymous"></script>
<!-- Fathom - beautiful, simple website analytics -->
<script src="https://cdn.usefathom.com/script.js" data-site="SIBMOOOY" defer></script>
<!-- / Fathom -->
<style>
  /* Inter font for better readability */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  body {
    font-family: 'Inter', sans-serif;
  }
  /* Custom styles for the message box */
  .message-box {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #4CAF50; /* Green */
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }
  .message-box.show {
    opacity: 1;
  }
  .message-box.error {
    background-color: #f44336; /* Red */
  }

  /* Modal styles */
  .modal {
    position: fixed;
    z-index: 1001;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0,0,0,0.4);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .modal-content {
    background-color: #fefefe;
    margin: auto;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    max-width: 90%;
    max-height: 90%;
    overflow-y: auto;
    position: relative;
  }
  .close-button {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    position: absolute;
    top: 10px;
    right: 20px;
  }
  .close-button:hover,
  .close-button:focus {
    color: black;
    text-decoration: none;
    cursor: pointer;
  }
</style>
</head>

<body class="bg-gray-100 text-gray-800 flex flex-col min-h-screen">

<div id="messageBox" class="message-box"></div>

<!-- Help Modal -->
<div id="helpModal" class="modal hidden">
  <div class="modal-content">
    <span class="close-button">&times;</span>
    <h1 class="text-3xl font-bold mb-4">Salty</h1>
    <p class="italic mb-4">Portable NaCl-powered encryption</p>
    <p class="mb-4">Salty makes it easy to send strongly-encrypted messages with a shared key. It uses <a href="https://nacl.cr.yp.to" target="_blank" class="text-blue-600 hover:underline">NaCl</a> for encryption and <a href="http://base91.sourceforge.net" target="_blank" class="text-blue-600 hover:underline">basE91</a> for portability.</p>
    <p class="mb-4">With Salty, you can encrypt a message as long as 185 characters and the resulting cipher will still fit in a tweet (~277 characters), making it ideal for encrypting tweets or other length-restricted communication. You can use it anywhere, though, with text of any length.</p>
    <h2 class="text-2xl font-semibold mb-3">Coded by Neatnik</h2>
    <p class="mb-4">Salty is an open source application written by Neatnik, and <a href="http://github.com/neatnik/salty" target="_blank" class="text-blue-600 hover:underline">available on GitHub</a>.</p>
    <p>Detailed information can be found in the project’s <a href="https://github.com/neatnik/salty/blob/master/README.md" target="_blank" class="text-blue-600 hover:underline">README</a> file.</p>
  </div>
</div>

<header class="bg-gray-800 text-white p-4 shadow-md">
  <div class="container mx-auto flex justify-between items-center">
    <p class="flex items-center space-x-2">
      <a href="/" class="text-white hover:text-gray-300 font-bold text-lg rounded-md p-2 hover:bg-gray-700 transition">
        <i class="fas fa-redo-alt mr-2"></i>リセット
      </a>
    </p>
    <p class="flex items-center space-x-4">
      <strong class="text-gray-300">表示言語:</strong>
      <a href="/en/" class="text-white hover:text-gray-300 font-bold rounded-md p-2 hover:bg-gray-700 transition">English</a>
      <a href="/" class="text-white hover:text-gray-300 font-bold rounded-md p-2 hover:bg-gray-700 transition">日本語</a>
    </p>
  </div>
</header>

<main class="container mx-auto p-6 flex-grow">
  <h1 class="text-4xl font-extrabold text-center text-blue-700 mb-8 mt-4">Salty 安全なテキスト暗号化</h1>

  <p class="text-center text-lg mb-8 leading-relaxed">
    下記にペイロードとキーをご記入して、「実行」をクリックしてください。ペイロードは、暗号化されていないテキスト、またはSaltyで暗号化（自動的に検出）することができます。
  </p>

  <form id="saltyForm" class="bg-white p-8 rounded-lg shadow-xl max-w-2xl mx-auto space-y-6 border border-blue-200">
    <div>
      <label for="payload" class="block text-lg font-semibold text-gray-700 mb-2">ペイロード</label>
      <textarea name="payload" id="payload" rows="8"
        class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-base resize-y"></textarea>
    </div>

    <div>
      <label for="key" class="block text-lg font-semibold text-gray-700 mb-2">キー</label>
      <input type="password" name="key" id="key"
        class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-base"
        placeholder="暗号化/復号のためのキーを入力">
    </div>

    <button type="submit"
      class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-xl shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-300 ease-in-out transform hover:scale-105">
      実行
    </button>
  </form>

  <div id="saltyResult" class="mt-12 bg-white p-8 rounded-lg shadow-xl max-w-2xl mx-auto border border-blue-200 hidden">
    <!-- Results will be displayed here by JavaScript -->
  </div>
</main>

<footer class="bg-gray-800 text-white p-6 mt-8 shadow-inner">
  <div class="container mx-auto text-center">
    <h4 class="text-xl font-semibold mb-3">株式会社イソリア</h4>
    <p class="mb-2">〒105-7105 東京都港区東新橋一丁目５番２号<br>汐留シティセンター５階 （Work Styling）</p>
    <p class="mb-4">Tel: 03-4577-3380 (代表)<br>Fax: 03-4577-3309</p>
    <img src="https://placehold.co/200x50/1f2937/d1d5db?text=COMPANY+LOGO" alt="Company Logo" class="mx-auto mb-4 rounded-md"/>
    <p>
      <button type="button" id="aboutSaltyBtn"
        class="bg-blue-500 text-white py-2 px-5 rounded-lg hover:bg-blue-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
        ソルティーについて
      </button>
    </p>
  </div>
</footer>

<script type="module">
  // Inlined salty.ts content for self-contained HTML.
  // The SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER will be replaced by the Deno server.
  const INJECTED_SALT_HEX = 'SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER';

  // --- Start inlined salty.ts content (modified for client-side usage) ---
  function hexToUint8Array(hexString) {
    const normalizedHexString = hexString.length % 2 !== 0 ? '0' + hexString : hexString;
    return Uint8Array.from(normalizedHexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
  }

  const b91_enctab = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '!', '#', '$',
    '%', '&', '(', ')', '*', '+', ',', '.', '/', ':', ';', '<', '=',
    '>', '?', '@', '[', ']', '^', '_', '`', '{', '|', '}', '~', '"'
  ];

  const b91_dectab = {};
  b91_enctab.forEach((char, index) => { b91_dectab[char] = index; });

  function base91_decode(d) {
    let n = 0; let b = 0; let o = []; let v = -1; const l = d.length;
    for (let i = 0; i < l; ++i) {
      const c = b91_dectab[d[i]];
      if (c === undefined) continue;
      if (v < 0) v = c;
      else {
        v += c * 91; b |= v << n; n += (v & 8191) > 88 ? 13 : 14;
        do { o.push(b & 0xFF); b >>= 8; n -= 8; } while (n > 7);
        v = -1;
      }
    }
    if (v + 1) o.push((b | (v << n)) & 0xFF);
    return o.length === 0 ? null : new Uint8Array(o);
  }

  function base91_encode(d) {
    let n = 0; let b = 0; let o = ''; const l = d.length;
    for (let i = 0; i < l; ++i) {
      b |= d[i] << n; n += 8;
      if (n > 13) {
        let v = b & 8191;
        if (v > 88) { b >>= 13; n -= 13; }
        else { v = b & 16383; b >>= 14; n -= 14; }
        o += b91_enctab[v % 91] + b91_enctab[Math.floor(v / 91)];
      }
    }
    if (n) {
      o += b91_enctab[b % 91];
      if (n > 7 || b > 90) o += b91_enctab[Math.floor(b / 91)];
    }
    return o;
  }

  async function salty_key(key, saltHex) { // Removed default saltHex here
    const enc = new TextEncoder(); const password = enc.encode(key);
    const salt = hexToUint8Array(saltHex);
    const iterations = 600000; const hash = 'SHA-512'; const keyLen = 32;
    const passwordKey = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: iterations, hash: hash },
      passwordKey, { name: 'AES-GCM', length: keyLen * 8 }, true, ['encrypt', 'decrypt']
    );
    return derivedKey;
  }

  async function salty_encrypt(message, cryptoKey) {
    const enc = new TextEncoder(); const data = enc.encode(message);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 }, cryptoKey, data
    );
    const fullCiphertext = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    fullCiphertext.set(iv, 0); fullCiphertext.set(new Uint8Array(ciphertext), iv.byteLength);
    return base91_encode(fullCiphertext);
  }

  async function salty_decrypt(encrypted, cryptoKey) {
    const decoded = base91_decode(encrypted);
    if (!decoded || decoded.length < 12 + 16) return null;
    const iv = decoded.slice(0, 12); const ciphertextWithTag = decoded.slice(12);
    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 }, cryptoKey, ciphertextWithTag
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) { return null; }
  }
  // --- End inlined salty.ts content ---

  const saltyForm = document.getElementById('saltyForm');
  const payloadInput = document.getElementById('payload');
  const keyInput = document.getElementById('key');
  const saltyResultDiv = document.getElementById('saltyResult');
  const messageBox = document.getElementById('messageBox');
  const aboutSaltyBtn = document.getElementById('aboutSaltyBtn');
  const helpModal = document.getElementById('helpModal');
  const closeButton = helpModal.querySelector('.close-button');

  /**
   * Displays a temporary message box for user feedback.
   * @param {string} message The message to display.
   * @param {boolean} isError True if it's an error message, false for success/info.
   */
  function showMessageBox(message, isError = false) {
    messageBox.textContent = message;
    messageBox.className = 'message-box show'; // Reset classes
    if (isError) {
      messageBox.classList.add('error');
    }
    setTimeout(() => {
      messageBox.classList.remove('show');
    }, 3000); // Hide after 3 seconds
  }

  /**
   * Copies text to the clipboard.
   * Uses `document.execCommand` for better iframe compatibility.
   * @param {string} text The text to copy.
   */
  function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // Avoid scrolling to bottom
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showMessageBox('クリップボードにコピーしました！');
      } else {
        showMessageBox('クリップボードへのコピーに失敗しました。', true);
      }
    } catch (err) {
      showMessageBox('クリップボードへのコピーに失敗しました。', true);
    }
    document.body.removeChild(textarea);
  }

  // Function to format and display output
  function displayResult(type, content) {
    let html = '';
    saltyResultDiv.innerHTML = ''; // Clear previous results
    saltyResultDiv.classList.remove('hidden');

    if (type === 'plaintext') {
      html += `<p class="text-sm text-gray-500 mb-2"><span class="font-bold text-green-600">自動検出: プレーンテキスト</span></p>`;
      html += `<h3 class="text-2xl font-semibold text-blue-700 mb-4">共有可能暗号テキスト</h3>`;
      html += `<div class="relative bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <p class="output uncompressed break-all text-gray-800">${escapeHtml(content.encryptedFormatted)}</p>
                  <button onclick="copyToClipboard('${escapeHtml(content.encryptedFormatted).replace(/'/g, "\\'")}')"
                          class="absolute top-2 right-2 bg-blue-200 text-blue-800 px-3 py-1 rounded-md text-xs hover:bg-blue-300 transition">
                    コピー
                  </button>
               </div>`;

      html += `<h3 class="text-2xl font-semibold text-blue-700 mb-4">共有可能暗号テキスト（圧縮版）</h3>`;
      html += `<div class="relative bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p class="output breakable compressed text-gray-800">${escapeHtml(content.encryptedCompressed)}</p>
                  <button onclick="copyToClipboard('${escapeHtml(content.encryptedCompressed).replace(/'/g, "\\'")}')"
                          class="absolute top-2 right-2 bg-blue-200 text-blue-800 px-3 py-1 rounded-md text-xs hover:bg-blue-300 transition">
                    コピー
                  </button>
               </div>
               <p class="text-sm text-gray-500 mt-2">${content.encryptedCompressed.length} chars</p>`;

    } else if (type === 'encrypted') {
      html += `<p class="text-sm text-gray-500 mb-2"><span class="font-bold text-purple-600">自動検出: Salty暗号化テキスト</span></p>`;
      html += `<h3 class="text-2xl font-semibold text-blue-700 mb-4">復号の結果</h3>`;
      html += `<div class="relative bg-green-50 p-4 rounded-lg border border-green-200">
                  <p class="output decrypted break-all text-gray-800">${escapeHtml(content.decrypted)}</p>
                  <button onclick="copyToClipboard('${escapeHtml(content.decrypted).replace(/'/g, "\\'")}')"
                          class="absolute top-2 right-2 bg-green-200 text-green-800 px-3 py-1 rounded-md text-xs hover:bg-green-300 transition">
                    コピー
                  </button>
               </div>`;
    } else if (type === 'error') {
        html += `<p class="text-sm text-red-500 mb-2"><span class="font-bold">エラー</span></p>`;
        html += `<div class="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
                    <p>${escapeHtml(content)}</p>
                 </div>`;
    }
    saltyResultDiv.innerHTML = html;
  }

  // Basic HTML escaping
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  saltyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = payloadInput.value;
    const key = keyInput.value;

    if (!payload || !key) {
      displayResult('error', 'ペイロードとキーの両方を入力してください。');
      return;
    }

    try {
      // Use the injected salt for client-side operations
      const cryptoKey = await salty_key(key, INJECTED_SALT_HEX);

      // Check if payload is already an encrypted Salty message
      const isEncryptedSalty = payload.includes('-- BEGIN SALTY ENCRYPTED MESSAGE --');

      if (isEncryptedSalty) {
        let cleanedPayload = payload
          .replace(/-- BEGIN SALTY ENCRYPTED MESSAGE --/g, '')
          .replace(/-- END SALTY ENCRYPTED MESSAGE --/g, '')
          .replace(/\n|\r| /g, '');

        const decrypted = await salty_decrypt(cleanedPayload, cryptoKey);
        if (decrypted !== null) {
          displayResult('encrypted', { decrypted: decrypted });
        } else {
          displayResult('error', '暗号化されたテキストの復号に失敗しました。キーが間違っているか、テキストが破損している可能性があります。');
        }
      } else {
        const encrypted = await salty_encrypt(payload, cryptoKey);

        const encryptedFormatted = '-- BEGIN SALTY ENCRYPTED MESSAGE --\n' +
                                    encrypted.match(/.{1,2}/g)?.join(' ') +
                                    '\n-- END SALTY ENCRYPTED MESSAGE --';

        displayResult('plaintext', {
          encryptedFormatted: encryptedFormatted,
          encryptedCompressed: encrypted
        });
      }
    } catch (e) {
      console.error("Operation failed:", e);
      displayResult('error', 'エラーが発生しました: ' + (e.message || '不明なエラー'));
    }
  });

  // Handle the "About Salty" button click to open modal
  aboutSaltyBtn.addEventListener('click', () => {
    helpModal.classList.remove('hidden');
  });

  // Handle closing the modal
  closeButton.addEventListener('click', () => {
    helpModal.classList.add('hidden');
  });

  // Close modal if user clicks outside of it
  window.addEventListener('click', (event) => {
    if (event.target === helpModal) {
      helpModal.classList.add('hidden');
    }
  });

</script>

</body>
</html>`;

const HTML_TEMPLATE_EN = `<!DOCTYPE html>
<html lang="en">
<head>
<title>Salty: Portable NaCl-powered text encryption</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:title" content="Salty: Portable NaCl-powered text encryption">
<meta property="og:url" content="https://salty.esolia.pro/">
<meta property="og:description" content="Portable NaCl-powered text encryption">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://kit.fontawesome.com/99c1e8e2fb.js" crossorigin="anonymous"></script>
<!-- Fathom - beautiful, simple website analytics -->
<script src="https://cdn.usefathom.com/script.js" data-site="SIBMOOOY" defer></script>
<!-- / Fathom -->
<style>
  /* Inter font for better readability */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  body {
    font-family: 'Inter', sans-serif;
  }
  /* Custom styles for the message box */
  .message-box {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #4CAF50; /* Green */
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }
  .message-box.show {
    opacity: 1;
  }
  .message-box.error {
    background-color: #f44336; /* Red */
  }

  /* Modal styles */
  .modal {
    position: fixed;
    z-index: 1001;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0,0,0,0.4);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .modal-content {
    background-color: #fefefe;
    margin: auto;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    max-width: 90%;
    max-height: 90%;
    overflow-y: auto;
    position: relative;
  }
  .close-button {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    position: absolute;
    top: 10px;
    right: 20px;
  }
  .close-button:hover,
  .close-button:focus {
    color: black;
    text-decoration: none;
    cursor: pointer;
  }
</style>
</head>

<body class="bg-gray-100 text-gray-800 flex flex-col min-h-screen">

<div id="messageBox" class="message-box"></div>

<!-- Help Modal -->
<div id="helpModal" class="modal hidden">
  <div class="modal-content">
    <span class="close-button">&times;</span>
    <h1 class="text-3xl font-bold mb-4">Salty</h1>
    <p class="italic mb-4">Portable NaCl-powered encryption</p>
    <p class="mb-4">Salty makes it easy to send strongly-encrypted messages with a shared key. It uses <a href="https://nacl.cr.yp.to" target="_blank" class="text-blue-600 hover:underline">NaCl</a> for encryption and <a href="http://base91.sourceforge.net" target="_blank" class="text-blue-600 hover:underline">basE91</a> for portability.</p>
    <p class="mb-4">With Salty, you can encrypt a message as long as 185 characters and the resulting cipher will still fit in a tweet (~277 characters), making it ideal for encrypting tweets or other length-restricted communication. You can use it anywhere, though, with text of any length.</p>
    <h2 class="text-2xl font-semibold mb-3">Coded by Neatnik</h2>
    <p class="mb-4">Salty is an open source application written by Neatnik, and <a href="http://github.com/neatnik/salty" target="_blank" class="text-blue-600 hover:underline">available on GitHub</a>.</p>
    <p>Detailed information can be found in the project’s <a href="https://github.com/neatnik/salty/blob/master/README.md" target="_blank" class="text-blue-600 hover:underline">README</a> file.</p>
  </div>
</div>


<header class="bg-gray-800 text-white p-4 shadow-md">
  <div class="container mx-auto flex justify-between items-center">
    <p class="flex items-center space-x-2">
      <a href="/en/" class="text-white hover:text-gray-300 font-bold text-lg rounded-md p-2 hover:bg-gray-700 transition">
        <i class="fas fa-redo-alt mr-2"></i>Reset
      </a>
    </p>
    <p class="flex items-center space-x-4">
      <strong class="text-gray-300">Languages:</strong>
      <a href="/en/" class="text-white hover:text-gray-300 font-bold rounded-md p-2 hover:bg-gray-700 transition">English</a>
      <a href="/" class="text-white hover:text-gray-300 font-bold rounded-md p-2 hover:bg-gray-700 transition">日本語</a>
    </p>
  </div>
</header>

<main class="container mx-auto p-6 flex-grow">
  <h1 class="text-4xl font-extrabold text-center text-blue-700 mb-8 mt-4">Salty Secure Text Encryption</h1>

  <p class="text-center text-lg mb-8 leading-relaxed">
    Enter a payload and provide a key below. Your payload can be unencrypted text, or a Salty-encrypted cipher (detected automatically).
  </p>

  <form id="saltyForm" class="bg-white p-8 rounded-lg shadow-xl max-w-2xl mx-auto space-y-6 border border-blue-200">
    <div>
      <label for="payload" class="block text-lg font-semibold text-gray-700 mb-2">Payload</label>
      <textarea name="payload" id="payload" rows="8"
        class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-base resize-y"></textarea>
    </div>

    <div>
      <label for="key" class="block text-lg font-semibold text-gray-700 mb-2">Key</label>
      <input type="password" name="key" id="key"
        class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-base"
        placeholder="Enter key for encryption/decryption">
    </div>

    <button type="submit"
      class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-xl shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-300 ease-in-out transform hover:scale-105">
      Go
    </button>
  </form>

  <div id="saltyResult" class="mt-12 bg-white p-8 rounded-lg shadow-xl max-w-2xl mx-auto border border-blue-200 hidden">
    <!-- Results will be displayed here by JavaScript -->
  </div>
</main>

<footer class="bg-gray-800 text-white p-6 mt-8 shadow-inner">
  <div class="container mx-auto text-center">
    <h4 class="text-xl font-semibold mb-3">eSolia Inc.</h4>
    <p class="mb-2">Shiodome City Center 5F (Work Styling)<br>
      1-5-2 Higashi-Shimbashi, Minato-ku, Tokyo, Japan, 105-7105<br>
      <br>
      Tel: 03-4577-3380 (Main)<br>
      Fax: 03-4577-3309</p>
    <img src="https://placehold.co/200x50/1f2937/d1d5db?text=COMPANY+LOGO" alt="Company Logo" class="mx-auto mb-4 rounded-md"/>
    <p>
      <button type="button" id="aboutSaltyBtn"
        class="bg-blue-500 text-white py-2 px-5 rounded-lg hover:bg-blue-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
        More About Salty
      </button>
    </p>
  </div>
</footer>

<script type="module">
  // Inlined salty.ts content for self-contained HTML.
  // The SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER will be replaced by the Deno server.
  const INJECTED_SALT_HEX = 'SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER';

  // --- Start inlined salty.ts content (modified for client-side usage) ---
  function hexToUint8Array(hexString) {
    const normalizedHexString = hexString.length % 2 !== 0 ? '0' + hexString : hexString;
    return Uint8Array.from(normalizedHexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
  }

  const b91_enctab = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '!', '#', '$',
    '%', '&', '(', ')', '*', '+', ',', '.', '/', ':', ';', '<', '=',
    '>', '?', '@', '[', ']', '^', '_', '`', '{', '|', '}', '~', '"'
  ];

  const b91_dectab = {};
  b91_enctab.forEach((char, index) => { b91_dectab[char] = index; });

  function base91_decode(d) {
    let n = 0; let b = 0; let o = []; let v = -1; const l = d.length;
    for (let i = 0; i < l; ++i) {
      const c = b91_dectab[d[i]];
      if (c === undefined) continue;
      if (v < 0) v = c;
      else {
        v += c * 91; b |= v << n; n += (v & 8191) > 88 ? 13 : 14;
        do { o.push(b & 0xFF); b >>= 8; n -= 8; } while (n > 7);
        v = -1;
      }
    }
    if (v + 1) o.push((b | (v << n)) & 0xFF);
    return o.length === 0 ? null : new Uint8Array(o);
  }

  function base91_encode(d) {
    let n = 0; let b = 0; let o = ''; const l = d.length;
    for (let i = 0; i < l; ++i) {
      b |= d[i] << n; n += 8;
      if (n > 13) {
        let v = b & 8191;
        if (v > 88) { b >>= 13; n -= 13; }
        else { v = b & 16383; b >>= 14; n -= 14; }
        o += b91_enctab[v % 91] + b91_enctab[Math.floor(v / 91)];
      }
    }
    if (n) {
      o += b91_enctab[b % 91];
      if (n > 7 || b > 90) o += b91_enctab[Math.floor(b / 91)];
    }
    return o;
  }

  async function salty_key(key, saltHex) { // Removed default saltHex here
    const enc = new TextEncoder(); const password = enc.encode(key);
    const salt = hexToUint8Array(saltHex);
    const iterations = 600000; const hash = 'SHA-512'; const keyLen = 32;
    const passwordKey = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: iterations, hash: hash },
      passwordKey, { name: 'AES-GCM', length: keyLen * 8 }, true, ['encrypt', 'decrypt']
    );
    return derivedKey;
  }

  async function salty_encrypt(message, cryptoKey) {
    const enc = new TextEncoder(); const data = enc.encode(message);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 }, cryptoKey, data
    );
    const fullCiphertext = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    fullCiphertext.set(iv, 0); fullCiphertext.set(new Uint8Array(ciphertext), iv.byteLength);
    return base91_encode(fullCiphertext);
  }

  async function salty_decrypt(encrypted, cryptoKey) {
    const decoded = base91_decode(encrypted);
    if (!decoded || decoded.length < 12 + 16) return null;
    const iv = decoded.slice(0, 12); const ciphertextWithTag = decoded.slice(12);
    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 }, cryptoKey, ciphertextWithTag
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) { return null; }
  }
  // --- End inlined salty.ts content ---

  const saltyForm = document.getElementById('saltyForm');
  const payloadInput = document.getElementById('payload');
  const keyInput = document.getElementById('key');
  const saltyResultDiv = document.getElementById('saltyResult');
  const messageBox = document.getElementById('messageBox');
  const aboutSaltyBtn = document.getElementById('aboutSaltyBtn');
  const helpModal = document.getElementById('helpModal');
  const closeButton = helpModal.querySelector('.close-button');

  /**
   * Displays a temporary message box for user feedback.
   * @param {string} message The message to display.
   * @param {boolean} isError True if it's an error message, false for success/info.
   */
  function showMessageBox(message, isError = false) {
    messageBox.textContent = message;
    messageBox.className = 'message-box show'; // Reset classes
    if (isError) {
      messageBox.classList.add('error');
    }
    setTimeout(() => {
      messageBox.classList.remove('show');
    }, 3000); // Hide after 3 seconds
  }

  /**
   * Copies text to the clipboard.
   * Uses `document.execCommand` for better iframe compatibility.
   * @param {string} text The text to copy.
   */
  function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // Avoid scrolling to bottom
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showMessageBox('クリップボードにコピーしました！');
      } else {
        showMessageBox('クリップボードへのコピーに失敗しました。', true);
      }
    } catch (err) {
      showMessageBox('クリップボードへのコピーに失敗しました。', true);
    }
    document.body.removeChild(textarea);
  }

  // Function to format and display output
  function displayResult(type, content) {
    let html = '';
    saltyResultDiv.innerHTML = ''; // Clear previous results
    saltyResultDiv.classList.remove('hidden');

    if (type === 'plaintext') {
      html += `<p class="text-sm text-gray-500 mb-2"><span class="font-bold text-green-600">自動検出: プレーンテキスト</span></p>`;
      html += `<h3 class="text-2xl font-semibold text-blue-700 mb-4">共有可能暗号テキスト</h3>`;
      html += `<div class="relative bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <p class="output uncompressed break-all text-gray-800">${escapeHtml(content.encryptedFormatted)}</p>
                  <button onclick="copyToClipboard('${escapeHtml(content.encryptedFormatted).replace(/'/g, "\\'")}')"
                          class="absolute top-2 right-2 bg-blue-200 text-blue-800 px-3 py-1 rounded-md text-xs hover:bg-blue-300 transition">
                    コピー
                  </button>
               </div>`;

      html += `<h3 class="text-2xl font-semibold text-blue-700 mb-4">共有可能暗号テキスト（圧縮版）</h3>`;
      html += `<div class="relative bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p class="output breakable compressed text-gray-800">${escapeHtml(content.encryptedCompressed)}</p>
                  <button onclick="copyToClipboard('${escapeHtml(content.encryptedCompressed).replace(/'/g, "\\'")}')"
                          class="absolute top-2 right-2 bg-blue-200 text-blue-800 px-3 py-1 rounded-md text-xs hover:bg-blue-300 transition">
                    コピー
                  </button>
               </div>
               <p class="text-sm text-gray-500 mt-2">${content.encryptedCompressed.length} chars</p>`;

    } else if (type === 'encrypted') {
      html += `<p class="text-sm text-gray-500 mb-2"><span class="font-bold text-purple-600">自動検出: Salty暗号化テキスト</span></p>`;
      html += `<h3 class="text-2xl font-semibold text-blue-700 mb-4">復号の結果</h3>`;
      html += `<div class="relative bg-green-50 p-4 rounded-lg border border-green-200">
                  <p class="output decrypted break-all text-gray-800">${escapeHtml(content.decrypted)}</p>
                  <button onclick="copyToClipboard('${escapeHtml(content.decrypted).replace(/'/g, "\\'")}')"
                          class="absolute top-2 right-2 bg-green-200 text-green-800 px-3 py-1 rounded-md text-xs hover:bg-green-300 transition">
                    コピー
                  </button>
               </div>`;
    } else if (type === 'error') {
        html += `<p class="text-sm text-red-500 mb-2"><span class="font-bold">エラー</span></p>`;
        html += `<div class="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
                    <p>${escapeHtml(content)}</p>
                 </div>`;
    }
    saltyResultDiv.innerHTML = html;
  }

  // Basic HTML escaping
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  saltyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = payloadInput.value;
    const key = keyInput.value;

    if (!payload || !key) {
      displayResult('error', 'ペイロードとキーの両方を入力してください。');
      return;
    }

    try {
      // Use the injected salt for client-side operations
      const cryptoKey = await salty_key(key, INJECTED_SALT_HEX);

      // Check if payload is already an encrypted Salty message
      const isEncryptedSalty = payload.includes('-- BEGIN SALTY ENCRYPTED MESSAGE --');

      if (isEncryptedSalty) {
        let cleanedPayload = payload
          .replace(/-- BEGIN SALTY ENCRYPTED MESSAGE --/g, '')
          .replace(/-- END SALTY ENCRYPTED MESSAGE --/g, '')
          .replace(/\n|\r| /g, '');

        const decrypted = await salty_decrypt(cleanedPayload, cryptoKey);
        if (decrypted !== null) {
          displayResult('encrypted', { decrypted: decrypted });
        } else {
          displayResult('error', '暗号化されたテキストの復号に失敗しました。キーが間違っているか、テキストが破損している可能性があります。');
        }
      } else {
        const encrypted = await salty_encrypt(payload, cryptoKey);

        const encryptedFormatted = '-- BEGIN SALTY ENCRYPTED MESSAGE --\n' +
                                    encrypted.match(/.{1,2}/g)?.join(' ') +
                                    '\n-- END SALTY ENCRYPTED MESSAGE --';

        displayResult('plaintext', {
          encryptedFormatted: encryptedFormatted,
          encryptedCompressed: encrypted
        });
      }
    } catch (e) {
      console.error("Operation failed:", e);
      displayResult('error', 'エラーが発生しました: ' + (e.message || '不明なエラー'));
    }
  });

  // Handle the "About Salty" button click to open modal
  aboutSaltyBtn.addEventListener('click', () => {
    helpModal.classList.remove('hidden');
  });

  // Handle closing the modal
  closeButton.addEventListener('click', () => {
    helpModal.classList.add('hidden');
  });

  // Close modal if user clicks outside of it
  window.addEventListener('click', (event) => {
    if (event.target === helpModal) {
      helpModal.classList.add('hidden');
    }
  });

</script>

</body>
</html>`;

const HTML_TEMPLATE_EN = `<!DOCTYPE html>
<html lang="en">
<head>
<title>Salty: Portable NaCl-powered text encryption</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:title" content="Salty: Portable NaCl-powered text encryption">
<meta property="og:url" content="https://salty.esolia.pro/">
<meta property="og:description" content="Portable NaCl-powered text encryption">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://kit.fontawesome.com/99c1e8e2fb.js" crossorigin="anonymous"></script>
<!-- Fathom - beautiful, simple website analytics -->
<script src="https://cdn.usefathom.com/script.js" data-site="SIBMOOOY" defer></script>
<!-- / Fathom -->
<style>
  /* Inter font for better readability */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  body {
    font-family: 'Inter', sans-serif;
  }
  /* Custom styles for the message box */
  .message-box {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #4CAF50; /* Green */
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }
  .message-box.show {
    opacity: 1;
  }
  .message-box.error {
    background-color: #f44336; /* Red */
  }

  /* Modal styles */
  .modal {
    position: fixed;
    z-index: 1001;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0,0,0,0.4);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .modal-content {
    background-color: #fefefe;
    margin: auto;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    max-width: 90%;
    max-height: 90%;
    overflow-y: auto;
    position: relative;
  }
  .close-button {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    position: absolute;
    top: 10px;
    right: 20px;
  }
  .close-button:hover,
  .close-button:focus {
    color: black;
    text-decoration: none;
    cursor: pointer;
  }
</style>
</head>

<body class="bg-gray-100 text-gray-800 flex flex-col min-h-screen">

<div id="messageBox" class="message-box"></div>

<!-- Help Modal -->
<div id="helpModal" class="modal hidden">
  <div class="modal-content">
    <span class="close-button">&times;</span>
    <h1 class="text-3xl font-bold mb-4">Salty</h1>
    <p class="italic mb-4">Portable NaCl-powered encryption</p>
    <p class="mb-4">Salty makes it easy to send strongly-encrypted messages with a shared key. It uses <a href="https://nacl.cr.yp.to" target="_blank" class="text-blue-600 hover:underline">NaCl</a> for encryption and <a href="http://base91.sourceforge.net" target="_blank" class="text-blue-600 hover:underline">basE91</a> for portability.</p>
    <p class="mb-4">With Salty, you can encrypt a message as long as 185 characters and the resulting cipher will still fit in a tweet (~277 characters), making it ideal for encrypting tweets or other length-restricted communication. You can use it anywhere, though, with text of any length.</p>
    <h2 class="text-2xl font-semibold mb-3">Coded by Neatnik</h2>
    <p class="mb-4">Salty is an open source application written by Neatnik, and <a href="http://github.com/neatnik/salty" target="_blank" class="text-blue-600 hover:underline">available on GitHub</a>.</p>
    <p>Detailed information can be found in the project’s <a href="https://github.com/neatnik/salty/blob/master/README.md" target="_blank" class="text-blue-600 hover:underline">README</a> file.</p>
  </div>
</div>


<header class="bg-gray-800 text-white p-4 shadow-md">
  <div class="container mx-auto flex justify-between items-center">
    <p class="flex items-center space-x-2">
      <a href="/en/" class="text-white hover:text-gray-300 font-bold text-lg rounded-md p-2 hover:bg-gray-700 transition">
        <i class="fas fa-redo-alt mr-2"></i>Reset
      </a>
    </p>
    <p class="flex items-center space-x-4">
      <strong class="text-gray-300">Languages:</strong>
      <a href="/en/" class="text-white hover:text-gray-300 font-bold rounded-md p-2 hover:bg-gray-700 transition">English</a>
      <a href="/" class="text-white hover:text-gray-300 font-bold rounded-md p-2 hover:bg-gray-700 transition">日本語</a>
    </p>
  </div>
</header>

<main class="container mx-auto p-6 flex-grow">
  <h1 class="text-4xl font-extrabold text-center text-blue-700 mb-8 mt-4">Salty Secure Text Encryption</h1>

  <p class="text-center text-lg mb-8 leading-relaxed">
    Enter a payload and provide a key below. Your payload can be unencrypted text, or a Salty-encrypted cipher (detected automatically).
  </p>

  <form id="saltyForm" class="bg-white p-8 rounded-lg shadow-xl max-w-2xl mx-auto space-y-6 border border-blue-200">
    <div>
      <label for="payload" class="block text-lg font-semibold text-gray-700 mb-2">Payload</label>
      <textarea name="payload" id="payload" rows="8"
        class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-base resize-y"></textarea>
    </div>

    <div>
      <label for="key" class="block text-lg font-semibold text-gray-700 mb-2">Key</label>
      <input type="password" name="key" id="key"
        class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-base"
        placeholder="Enter key for encryption/decryption">
    </div>

    <button type="submit"
      class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-xl shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-300 ease-in-out transform hover:scale-105">
      Go
    </button>
  </form>

  <div id="saltyResult" class="mt-12 bg-white p-8 rounded-lg shadow-xl max-w-2xl mx-auto border border-blue-200 hidden">
    <!-- Results will be displayed here by JavaScript -->
  </div>
</main>

<footer class="bg-gray-800 text-white p-6 mt-8 shadow-inner">
  <div class="container mx-auto text-center">
    <h4 class="text-xl font-semibold mb-3">eSolia Inc.</h4>
    <p class="mb-2">Shiodome City Center 5F (Work Styling)<br>
      1-5-2 Higashi-Shimbashi, Minato-ku, Tokyo, Japan, 105-7105<br>
      <br>
      Tel: 03-4577-3380 (Main)<br>
      Fax: 03-4577-3309</p>
    <img src="https://placehold.co/200x50/1f2937/d1d5db?text=COMPANY+LOGO" alt="Company Logo" class="mx-auto mb-4 rounded-md"/>
    <p>
      <button type="button" id="aboutSaltyBtn"
        class="bg-blue-500 text-white py-2 px-5 rounded-lg hover:bg-blue-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
        More About Salty
      </button>
    </p>
  </div>
</footer>

<script type="module">
  // Inlined salty.ts content for self-contained HTML.
  // The SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER will be replaced by the Deno server.
  const INJECTED_SALT_HEX = 'SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER';

  // --- Start inlined salty.ts content (modified for client-side usage) ---
  function hexToUint8Array(hexString) {
    const normalizedHexString = hexString.length % 2 !== 0 ? '0' + hexString : hexString;
    return Uint8Array.from(normalizedHexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
  }

  const b91_enctab = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '!', '#', '$',
    '%', '&', '(', ')', '*', '+', ',', '.', '/', ':', ';', '<', '=',
    '>', '?', '@', '[', ']', '^', '_', '`', '{', '|', '}', '~', '"'
  ];

  const b91_dectab = {};
  b91_enctab.forEach((char, index) => { b91_dectab[char] = index; });

  function base91_decode(d) {
    let n = 0; let b = 0; let o = []; let v = -1; const l = d.length;
    for (let i = 0; i < l; ++i) {
      const c = b91_dectab[d[i]];
      if (c === undefined) continue;
      if (v < 0) v = c;
      else {
        v += c * 91; b |= v << n; n += (v & 8191) > 88 ? 13 : 14;
        do { o.push(b & 0xFF); b >>= 8; n -= 8; } while (n > 7);
        v = -1;
      }
    }
    if (v + 1) o.push((b | (v << n)) & 0xFF);
    return o.length === 0 ? null : new Uint8Array(o);
  }

  function base91_encode(d) {
    let n = 0; let b = 0; let o = ''; const l = d.length;
    for (let i = 0; i < l; ++i) {
      b |= d[i] << n; n += 8;
      if (n > 13) {
        let v = b & 8191;
        if (v > 88) { b >>= 13; n -= 13; }
        else { v = b & 16383; b >>= 14; n -= 14; }
        o += b91_enctab[v % 91] + b91_enctab[Math.floor(v / 91)];
      }
    }
    if (n) {
      o += b91_enctab[b % 91];
      if (n > 7 || b > 90) o += b91_enctab[Math.floor(b / 91)];
    }
    return o;
  }

  async function salty_key(key, saltHex) { // Removed default saltHex here
    const enc = new TextEncoder(); const password = enc.encode(key);
    const salt = hexToUint8Array(saltHex);
    const iterations = 600000; const hash = 'SHA-512'; const keyLen = 32;
    const passwordKey = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: iterations, hash: hash },
      passwordKey, { name: 'AES-GCM', length: keyLen * 8 }, true, ['encrypt', 'decrypt']
    );
    return derivedKey;
  }

  async function salty_encrypt(message, cryptoKey) {
    const enc = new TextEncoder(); const data = enc.encode(message);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 }, cryptoKey, data
    );
    const fullCiphertext = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    fullCiphertext.set(iv, 0); fullCiphertext.set(new Uint8Array(ciphertext), iv.byteLength);
    return base91_encode(fullCiphertext);
  }

  async function salty_decrypt(encrypted, cryptoKey) {
    const decoded = base91_decode(encrypted);
    if (!decoded || decoded.length < 12 + 16) return null;
    const iv = decoded.slice(0, 12); const ciphertextWithTag = decoded.slice(12);
    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 }, cryptoKey, ciphertextWithTag
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) { return null; }
  }
  // --- End inlined salty.ts content ---

  const saltyForm = document.getElementById('saltyForm');
  const payloadInput = document.getElementById('payload');
  const keyInput = document.getElementById('key');
  const saltyResultDiv = document.getElementById('saltyResult');
  const messageBox = document.getElementById('messageBox');
  const aboutSaltyBtn = document.getElementById('aboutSaltyBtn');
  const helpModal = document.getElementById('helpModal');
  const closeButton = helpModal.querySelector('.close-button');

  /**
   * Displays a temporary message box for user feedback.
   * @param {string} message The message to display.
   * @param {boolean} isError True if it's an error message, false for success/info.
   */
  function showMessageBox(message, isError = false) {
    messageBox.textContent = message;
    messageBox.className = 'message-box show'; // Reset classes
    if (isError) {
      messageBox.classList.add('error');
    }
    setTimeout(() => {
      messageBox.classList.remove('show');
    }, 3000); // Hide after 3 seconds
  }

  /**
   * Copies text to the clipboard.
   * Uses `document.execCommand` for better iframe compatibility.
   * @param {string} text The text to copy.
   */
  function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // Avoid scrolling to bottom
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showMessageBox('Copied to clipboard!');
      } else {
        showMessageBox('Failed to copy to clipboard.', true);
      }
    } catch (err) {
      showMessageBox('Failed to copy to clipboard.', true);
    }
    document.body.removeChild(textarea);
  }

  // Function to format and display output
  function displayResult(type, content) {
    let html = '';
    saltyResultDiv.innerHTML = ''; // Clear previous results
    saltyResultDiv.classList.remove('hidden');

    if (type === 'plaintext') {
      html += `<p class="text-sm text-gray-500 mb-2"><span class="font-bold text-green-600">Auto-detected: unencrypted plaintext</span></p>`;
      html += `<h3 class="text-2xl font-semibold text-blue-700 mb-4">Shareable cipher</h3>`;
      html += `<div class="relative bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <p class="output uncompressed break-all text-gray-800">${escapeHtml(content.encryptedFormatted)}</p>
                  <button onclick="copyToClipboard('${escapeHtml(content.encryptedFormatted).replace(/'/g, "\\'")}')"
                          class="absolute top-2 right-2 bg-blue-200 text-blue-800 px-3 py-1 rounded-md text-xs hover:bg-blue-300 transition">
                    Copy
                  </button>
               </div>`;

      html += `<h3 class="text-2xl font-semibold text-blue-700 mb-4">Compressed version</h3>`;
      html += `<div class="relative bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p class="output breakable compressed text-gray-800">${escapeHtml(content.encryptedCompressed)}</p>
                  <button onclick="copyToClipboard('${escapeHtml(content.encryptedCompressed).replace(/'/g, "\\'")}')"
                          class="absolute top-2 right-2 bg-blue-200 text-blue-800 px-3 py-1 rounded-md text-xs hover:bg-blue-300 transition">
                    Copy
                  </button>
               </div>
               <p class="text-sm text-gray-500 mt-2">${content.encryptedCompressed.length} chars</p>`;

    } else if (type === 'encrypted') {
      html += `<p class="text-sm text-gray-500 mb-2"><span class="font-bold text-purple-600">Auto-detected: Salty cipher</span></p>`;
      html += `<h3 class="text-2xl font-semibold text-blue-700 mb-4">Decrypted Result</h3>`;
      html += `<div class="relative bg-green-50 p-4 rounded-lg border border-green-200">
                  <p class="output decrypted break-all text-gray-800">${escapeHtml(content.decrypted)}</p>
                  <button onclick="copyToClipboard('${escapeHtml(content.decrypted).replace(/'/g, "\\'")}')"
                          class="absolute top-2 right-2 bg-green-200 text-green-800 px-3 py-1 rounded-md text-xs hover:bg-green-300 transition">
                    Copy
                  </button>
               </div>`;
    } else if (type === 'error') {
        html += `<p class="text-sm text-red-500 mb-2"><span class="font-bold">Error</span></p>`;
        html += `<div class="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
                    <p>${escapeHtml(content)}</p>
                 </div>`;
    }
    saltyResultDiv.innerHTML = html;
  }

  // Basic HTML escaping
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  saltyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = payloadInput.value;
    const key = keyInput.value;

    if (!payload || !key) {
      displayResult('error', 'Please enter both payload and key.');
      return;
    }

    try {
      // Use the injected salt for client-side operations
      const cryptoKey = await salty_key(key, INJECTED_SALT_HEX);

      // Check if payload is already an encrypted Salty message
      const isEncryptedSalty = payload.includes('-- BEGIN SALTY ENCRYPTED MESSAGE --');

      if (isEncryptedSalty) {
        let cleanedPayload = payload
          .replace(/-- BEGIN SALTY ENCRYPTED MESSAGE --/g, '')
          .replace(/-- END SALTY ENCRYPTED MESSAGE --/g, '')
          .replace(/\n|\r| /g, '');

        const decrypted = await salty_decrypt(cleanedPayload, cryptoKey);
        if (decrypted !== null) {
          displayResult('encrypted', { decrypted: decrypted });
        } else {
          displayResult('error', 'Decryption of encrypted text failed. The key might be wrong or the text corrupted.');
        }
      } else {
        const encrypted = await salty_encrypt(payload, cryptoKey);

        const encryptedFormatted = '-- BEGIN SALTY ENCRYPTED MESSAGE --\n' +
                                    encrypted.match(/.{1,2}/g)?.join(' ') +
                                    '\n-- END SALTY ENCRYPTED MESSAGE --';

        displayResult('plaintext', {
          encryptedFormatted: encryptedFormatted,
          encryptedCompressed: encrypted
        });
      }
    } catch (e) {
      console.error("Operation failed:", e);
      displayResult('error', 'An error occurred: ' + (e.message || 'Unknown error'));
    }
  });

  // Handle the "More About Salty" button click to open modal
  aboutSaltyBtn.addEventListener('click', () => {
    helpModal.classList.remove('hidden');
  });

  // Handle closing the modal
  closeButton.addEventListener('click', () => {
    helpModal.classList.add('hidden');
  });

  // Close modal if user clicks outside of it
  window.addEventListener('click', (event) => {
    if (event.target === helpModal) {
      helpModal.classList.add('hidden');
    }
  });

</script>

</body>
</html>
`;

// Helper to replace the placeholder in HTML template
function injectSaltIntoHtml(htmlContent: string, saltValue: string): string {
  return htmlContent.replace(SALT_PLACEHOLDER, saltValue);
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

  // Serve the Japanese UI
  if (pathname === '/') {
    const responseHtml = injectSaltIntoHtml(HTML_TEMPLATE_JP, SALT_HEX);
    return new Response(responseHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Serve the English UI
  if (pathname === '/en/' || pathname === '/en') { // Handle both /en/ and /en
    const responseHtml = injectSaltIntoHtml(HTML_TEMPLATE_EN, SALT_HEX); // Corrected typo here
    return new Response(responseHtml, {
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
      // If API_KEY environment variable is not set, allow access
      // For production, you should make this `Deno.exit(1)` at startup
      console.warn("API_KEY environment variable not set. API endpoint is not authenticated (for local testing).");
    }

    // Expecting application/json for payload and key
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return new Response('Content-Type must be application/json', { status: 400 });
    }

    try {
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
    } catch (error) {
      console.error("API Error:", error);
      return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
  }

  // Handle favicon.ico (common request)
  if (pathname === '/favicon.ico') {
    return new Response('', { status: 204 }); // No content for now
  }

  // Fallback for other requests (e.g., /style.css or /img/logo.svg placeholders)
  // In a real application, you'd serve these from a static directory.
  // For this example, we'll provide dummy responses or 404s.
  if (pathname.includes('/style.css') || pathname.includes('/img/logo_horiz_darkblue_bgsoftyellow.svg')) {
    // Return an empty response or a 404 for these, as Tailwind replaces style.css
    // and logo is a placeholder image.
    return new Response('Not Found', { status: 404 });
  }

  // Catch-all for unknown routes
  return new Response('Not Found', { status: 404 });
});
