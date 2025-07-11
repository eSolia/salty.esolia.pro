/**
 * Password generation module for Salty
 * Supports both Diceware passphrases and random passwords
 */

/**
 * Configuration for password generation
 */
export interface PasswordGeneratorConfig {
  type: "diceware" | "random";
  length?: number; // For random: character count, for diceware: word count
  includeUppercase?: boolean; // For random passwords
  includeLowercase?: boolean; // For random passwords
  includeNumbers?: boolean; // For random passwords
  includeSymbols?: boolean; // For random passwords
  excludedSymbols?: string; // Symbols to exclude from generation
  wordList?: string[]; // For diceware
  separator?: string; // For diceware (default: " ")
}

/**
 * Default character sets for random password generation
 */
const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
} as const;

// Default symbols to exclude (iPhone second screen symbols)
const DEFAULT_EXCLUDED_SYMBOLS = "[]{}#<>|";

/**
 * Get/set excluded symbols in localStorage
 * Returns user's saved preferences if they exist, otherwise returns defaults
 */
export function getExcludedSymbols(): string {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    const saved = localStorage.getItem("saltyExcludedSymbols");
    // Only use defaults if nothing has ever been saved
    // If user saved empty string "", respect that choice
    if (saved === null) {
      return DEFAULT_EXCLUDED_SYMBOLS;
    }
    return saved;
  }
  return DEFAULT_EXCLUDED_SYMBOLS;
}

export function setExcludedSymbols(symbols: string): void {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    localStorage.setItem("saltyExcludedSymbols", symbols);
  }
}

/**
 * Check if user has customized their excluded symbols
 */
export function hasCustomExcludedSymbols(): boolean {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    return localStorage.getItem("saltyExcludedSymbols") !== null;
  }
  return false;
}

/**
 * Get the default excluded symbols for display/reference
 */
export function getDefaultExcludedSymbols(): string {
  return DEFAULT_EXCLUDED_SYMBOLS;
}

/**
 * Filter out excluded symbols from a character set
 */
function filterExcludedSymbols(
  charSet: string,
  excludedSymbols: string,
): string {
  if (!excludedSymbols) return charSet;

  const excluded = new Set(excludedSymbols.split(""));
  return charSet.split("").filter((char) => !excluded.has(char)).join("");
}

/**
 * A subset of Japanese words suitable for diceware
 * Filtered for reasonable length and memorability
 */
const DEFAULT_JAPANESE_WORDS = [
  "sakura",
  "neko",
  "inu",
  "tori",
  "kawa",
  "yama",
  "umi",
  "sora",
  "tsuki",
  "hoshi",
  "ame",
  "yuki",
  "kaze",
  "kumo",
  "taiyou",
  "mori",
  "ki",
  "hana",
  "mizu",
  "hi",
  "tsuchi",
  "ishi",
  "suna",
  "kusa",
  "ha",
  "ne",
  "mi",
  "tane",
  "eda",
  "miki",
  "hikari",
  "kage",
  "oto",
  "koe",
  "uta",
  "odori",
  "e",
  "iro",
  "katachi",
  "sen",
  "maru",
  "shikaku",
  "sankaku",
  "ten",
  "chikara",
  "kokoro",
  "karada",
  "te",
  "ashi",
  "me",
  "mimi",
  "hana",
  "kuchi",
  "shita",
  "ha",
  "atama",
  "kami",
  "kao",
  "kubi",
  "kata",
  "mune",
  "onaka",
  "se",
  "koshi",
  "ude",
  "yubi",
  "tsume",
  "hone",
  "chi",
  "iki",
  "tabemono",
  "nomimono",
  "gohan",
  "pan",
  "niku",
  "sakana",
  "yasai",
  "kudamono",
  "tamago",
  "gyuunyuu",
  "ocha",
  "koucha",
  "koohii",
  "juusu",
  "mizu",
  "osake",
  "biiru",
  "wain",
  "asa",
  "hiru",
  "yoru",
  "ban",
  "kyou",
  "ashita",
  "kinou",
  "konshuu",
  "senshuu",
  "raishuu",
  "kotoshi",
  "kyonen",
  "rainen",
  "getsu",
  "ka",
  "sui",
  "moku",
  "kin",
  "do",
  "nichi",
  "tsuitachi",
  "futsuka",
  "mikka",
  "yokka",
  "itsuka",
  "muika",
  "nanoka",
  "youka",
  "kokonoka",
  "tooka",
  "hatsuka",
  "sanjuunichi",
] as const;

/**
 * Generate a cryptographically secure random integer between 0 and max (exclusive)
 */
function getSecureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  let randomValue: number;

  // Rejection sampling to avoid modulo bias
  const maxValid = Math.floor(0xFFFFFFFF / max) * max;
  do {
    crypto.getRandomValues(array);
    randomValue = array[0];
  } while (randomValue >= maxValid);

  return randomValue % max;
}

/**
 * Generate a random password with specified character sets
 */
export function generateRandomPassword(
  config: PasswordGeneratorConfig,
): string {
  const length = config.length || 16;
  const includeUppercase = config.includeUppercase ?? true;
  const includeLowercase = config.includeLowercase ?? true;
  const includeNumbers = config.includeNumbers ?? true;
  const includeSymbols = config.includeSymbols ?? true;
  const excludedSymbols = config.excludedSymbols || getExcludedSymbols();

  // Build character set
  let charSet = "";
  if (includeUppercase) charSet += CHAR_SETS.uppercase;
  if (includeLowercase) charSet += CHAR_SETS.lowercase;
  if (includeNumbers) charSet += CHAR_SETS.numbers;
  if (includeSymbols) {
    const filteredSymbols = filterExcludedSymbols(
      CHAR_SETS.symbols,
      excludedSymbols,
    );
    if (filteredSymbols.length > 0) {
      charSet += filteredSymbols;
    }
  }

  if (charSet.length === 0) {
    throw new Error("At least one character set must be included");
  }

  // Generate password
  const password: string[] = [];

  // Ensure at least one character from each selected set
  if (includeUppercase) {
    password.push(
      CHAR_SETS.uppercase[getSecureRandomInt(CHAR_SETS.uppercase.length)],
    );
  }
  if (includeLowercase) {
    password.push(
      CHAR_SETS.lowercase[getSecureRandomInt(CHAR_SETS.lowercase.length)],
    );
  }
  if (includeNumbers) {
    password.push(
      CHAR_SETS.numbers[getSecureRandomInt(CHAR_SETS.numbers.length)],
    );
  }
  if (includeSymbols) {
    const filteredSymbols = filterExcludedSymbols(
      CHAR_SETS.symbols,
      excludedSymbols,
    );
    if (filteredSymbols.length > 0) {
      password.push(
        filteredSymbols[getSecureRandomInt(filteredSymbols.length)],
      );
    }
  }

  // Fill remaining length
  for (let i = password.length; i < length; i++) {
    password.push(charSet[getSecureRandomInt(charSet.length)]);
  }

  // Shuffle password to avoid predictable patterns
  for (let i = password.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join("");
}

/**
 * Generate a diceware passphrase
 */
// Cache for the loaded wordlist
let cachedWordList: string[] | null = null;

/**
 * Load the Japanese diceware wordlist (browser-compatible)
 */
async function loadWordList(): Promise<string[]> {
  if (cachedWordList) {
    return cachedWordList;
  }

  try {
    const response = await fetch("/japanese-diceware-wordlist.txt");
    if (response.ok) {
      const text = await response.text();
      cachedWordList = text.split("\n")
        .map((word) => word.trim())
        .filter((word) => word.length > 0);
      console.log(
        `Loaded ${cachedWordList.length} words from diceware wordlist`,
      );
      return cachedWordList;
    }
  } catch (error) {
    console.warn("Failed to load full wordlist, using default", error);
  }

  // Fall back to default list
  return [...DEFAULT_JAPANESE_WORDS];
}

export function generateDicewarePassphrase(
  config: PasswordGeneratorConfig,
): string {
  const wordCount = config.length || 6; // Default to 6 words
  const wordList = config.wordList || cachedWordList || DEFAULT_JAPANESE_WORDS;
  const separator = config.separator || " "; // Default to space for easier mobile typing

  if (wordList.length < 100) {
    throw new Error("Word list must contain at least 100 words for security");
  }

  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(wordList[getSecureRandomInt(wordList.length)]);
  }

  return words.join(separator);
}

/**
 * Initialize the wordlist (call this on page load)
 */
export async function initializeDiceware(): Promise<void> {
  await loadWordList();
}

/**
 * Main password generation function
 */
export function generatePassword(config: PasswordGeneratorConfig): string {
  if (config.type === "diceware") {
    return generateDicewarePassphrase(config);
  } else if (config.type === "random") {
    return generateRandomPassword(config);
  } else {
    throw new Error("Invalid password type. Must be 'diceware' or 'random'");
  }
}

// Actual size of our combined Japanese diceware word list
// Combined from github.com/tsuchm/diceware-ja and github.com/RickCogley/jpassgen
const JAPANESE_WORDLIST_SIZE = 10306;

/**
 * Calculate entropy bits for a password
 */
export function calculatePasswordEntropy(
  password: string,
  isDiceware: boolean = false,
  wordCount?: number,
): number {
  if (isDiceware && wordCount) {
    // For diceware: log2(wordListSize) * wordCount
    // Using actual Japanese word list size for accurate entropy
    const bitsPerWord = Math.log2(JAPANESE_WORDLIST_SIZE);
    return bitsPerWord * wordCount;
  } else {
    // For random passwords, count unique character sets used
    let charSetSize = 0;
    if (/[a-z]/.test(password)) charSetSize += 26;
    if (/[A-Z]/.test(password)) charSetSize += 26;
    if (/[0-9]/.test(password)) charSetSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charSetSize += 32; // Approximation for symbols

    return Math.log2(charSetSize) * password.length;
  }
}
