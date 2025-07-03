/**
 * password-strength.ts
 *
 * Pure functional module for calculating password strength and entropy.
 * Provides real-time feedback and improvement suggestions.
 *
 * Following Salty's programming paradigm: pure functions for crypto-related operations.
 */

export interface PasswordStrength {
  score: number; // 0-4 (very weak to very strong)
  entropy: number; // bits of entropy
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crackTimeDisplay: string;
}

export interface StrengthLevel {
  score: number;
  label: string;
  color: string;
  minEntropy: number;
}

export const STRENGTH_LEVELS: StrengthLevel[] = [
  { score: 0, label: "Very Weak", color: "#DC2626", minEntropy: 0 }, // red-600
  { score: 1, label: "Weak", color: "#F59E0B", minEntropy: 20 }, // amber-500
  { score: 2, label: "Fair", color: "#FBBF24", minEntropy: 40 }, // amber-400
  { score: 3, label: "Good", color: "#84CC16", minEntropy: 60 }, // lime-500
  { score: 4, label: "Strong", color: "#22C55E", minEntropy: 80 }, // green-500
];

/**
 * Character set definitions for entropy calculation
 */
const CHAR_SETS = {
  lowercase: { regex: /[a-z]/, size: 26 },
  uppercase: { regex: /[A-Z]/, size: 26 },
  digits: { regex: /[0-9]/, size: 10 },
  symbols: { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, size: 32 }, // Common symbols
};

/**
 * Common password patterns that reduce security
 */
const COMMON_PATTERNS = [
  { regex: /^(password|pass|pwd)/i, penalty: 20 },
  { regex: /^(admin|user|test|demo)/i, penalty: 20 },
  { regex: /^\d+$/, penalty: 15 }, // Only numbers
  { regex: /^[a-z]+$/, penalty: 10 }, // Only lowercase
  { regex: /(.)\1{2,}/, penalty: 10 }, // Repeated characters (3+)
  { regex: /^(12345|qwerty|abc123|letmein)/i, penalty: 30 },
  { regex: /(19|20)\d{2}/, penalty: 5 }, // Years
];

/**
 * Calculate the character space size based on password content
 */
function calculateCharSpace(password: string): number {
  let charSpace = 0;

  for (const [, set] of Object.entries(CHAR_SETS)) {
    if (set.regex.test(password)) {
      charSpace += set.size;
    }
  }

  return charSpace;
}

/**
 * Detect if a password is likely a diceware passphrase
 * Heuristic: contains spaces and consists of lowercase words
 */
function isDicewarePassphrase(password: string): boolean {
  // Must contain spaces to be diceware
  if (!password.includes(" ")) return false;

  // Split into words
  const words = password.split(" ");

  // Typical diceware has 3-10 words
  if (words.length < 3 || words.length > 10) return false;

  // Check if all parts are word-like (mostly lowercase letters, maybe some numbers)
  const wordPattern = /^[a-z0-9]+$/i;
  const allWordsValid = words.every((word) =>
    word.length >= 2 && word.length <= 15 && wordPattern.test(word)
  );

  return allWordsValid;
}

/**
 * Calculate password entropy in bits
 * Handles both random passwords and diceware passphrases
 */
function calculateEntropy(password: string): number {
  if (password.length === 0) return 0;

  // Check if this looks like a diceware passphrase
  if (isDicewarePassphrase(password)) {
    const words = password.split(" ");
    // Use actual Japanese wordlist size for entropy calculation
    const WORDLIST_SIZE = 10306; // Actual size of our wordlist
    const bitsPerWord = Math.log2(WORDLIST_SIZE);
    return words.length * bitsPerWord;
  }

  // For random passwords, use character space calculation
  const charSpace = calculateCharSpace(password);
  if (charSpace === 0) return 0;

  // Base entropy calculation
  let entropy = password.length * Math.log2(charSpace);

  // Apply penalties for common patterns
  for (const pattern of COMMON_PATTERNS) {
    if (pattern.regex.test(password)) {
      entropy -= pattern.penalty;
    }
  }

  // Bonus for mixing character types
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const mixedTypes =
    [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (mixedTypes >= 3) {
    entropy += 5; // Bonus for good character mixing
  }

  return Math.max(0, entropy);
}

/**
 * Estimate crack time based on entropy
 * Assumes 10^12 guesses per second (modern GPU cluster)
 */
function estimateCrackTime(entropy: number): string {
  const guessesPerSecond = 1e12;
  const possibleCombinations = Math.pow(2, entropy);
  const seconds = possibleCombinations / (2 * guessesPerSecond); // Average case

  if (seconds < 1) return "instant";
  if (seconds < 60) return "< 1 minute";
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 31536000) return `${Math.round(seconds / 2592000)} months`;

  const years = seconds / 31536000;
  if (years < 1000) return `${Math.round(years)} years`;
  if (years < 1e6) return `${Math.round(years / 1000)}k years`;
  if (years < 1e9) return `${Math.round(years / 1e6)}M years`;

  return "centuries";
}

/**
 * Generate feedback and suggestions based on password analysis
 */
function generateFeedback(
  password: string,
  entropy: number,
): { warning: string; suggestions: string[] } {
  const suggestions: string[] = [];
  let warning = "";

  // Special handling for diceware passphrases
  if (isDicewarePassphrase(password)) {
    const words = password.split(" ");
    // More nuanced feedback based on word count
    if (words.length < 3) {
      suggestions.push("Use at least 3 words for basic security");
      warning = "Too few words";
    } else if (words.length === 3) {
      // 3 words is acceptable for many uses
      suggestions.push("Good for most uses; add words for high-security needs");
    } else if (words.length === 4) {
      suggestions.push("Excellent passphrase strength");
    } else if (words.length >= 5) {
      suggestions.push("Very strong passphrase!");
    }

    // Only warn if really too weak
    if (entropy < 26) {
      warning = "Too few words for adequate security";
    }

    // Skip character-based suggestions for diceware
    return { warning, suggestions };
  }

  // Length-based suggestions for random passwords
  if (password.length < 8) {
    suggestions.push("Use at least 8 characters");
  } else if (password.length < 12) {
    suggestions.push("Consider using 12+ characters for better security");
  }

  // Character variety suggestions
  if (!/[a-z]/.test(password)) {
    suggestions.push("Add lowercase letters");
  }
  if (!/[A-Z]/.test(password)) {
    suggestions.push("Add uppercase letters");
  }
  if (!/[0-9]/.test(password)) {
    suggestions.push("Add numbers");
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    suggestions.push("Add special characters (!@#$%^&*)");
  }

  // Pattern warnings
  if (/^(password|pass|pwd)/i.test(password)) {
    warning = "Avoid using 'password' or similar";
  } else if (/^(admin|user|test|demo)/i.test(password)) {
    warning = "Common word detected - easily guessable";
  } else if (/^\d+$/.test(password)) {
    warning = "Only numbers - very predictable";
  } else if (/^[a-z]+$/.test(password)) {
    warning = "Only lowercase letters - limited character set";
  } else if (/(.)\1{3,}/.test(password)) {
    warning = "Repeated characters reduce security";
  }

  // Entropy-based warnings
  if (entropy < 30 && !warning) {
    warning = "Very predictable - easily crackable";
  } else if (entropy < 50 && !warning) {
    warning = "Could be cracked with moderate effort";
  }

  // Remove redundant suggestions if password is already strong
  if (entropy > 80 && suggestions.length > 0) {
    suggestions.length = 0;
    suggestions.push("Excellent password strength!");
  }

  return { warning, suggestions };
}

/**
 * Calculate password strength score (0-4) based on entropy
 * Uses different thresholds for diceware vs random passwords
 */
function calculateScore(entropy: number, isDiceware: boolean = false): number {
  // Diceware-specific thresholds
  // Based on practical security: 3 words from 10k list = ~40 bits
  // This is equivalent to a 9-char random password with mixed case/numbers
  if (isDiceware) {
    if (entropy >= 65) return 4; // 5+ words = Strong (very secure)
    if (entropy >= 52) return 3; // 4 words = Good (recommended minimum)
    if (entropy >= 39) return 3; // 3 words = Good (acceptable for many uses)
    if (entropy >= 26) return 1; // 2 words = Weak
    return 0; // 1 word = Very Weak
  }

  // Regular password thresholds
  for (let i = STRENGTH_LEVELS.length - 1; i >= 0; i--) {
    if (entropy >= STRENGTH_LEVELS[i].minEntropy) {
      return STRENGTH_LEVELS[i].score;
    }
  }
  return 0;
}

/**
 * Main function to analyze password strength
 */
export function analyzePasswordStrength(password: string): PasswordStrength {
  const isDiceware = isDicewarePassphrase(password);
  const entropy = calculateEntropy(password);
  const score = calculateScore(entropy, isDiceware);
  const feedback = generateFeedback(password, entropy);
  const crackTimeDisplay = estimateCrackTime(entropy);

  return {
    score,
    entropy,
    feedback,
    crackTimeDisplay,
  };
}

/**
 * Get strength level details for a given score
 */
export function getStrengthLevel(score: number): StrengthLevel {
  return STRENGTH_LEVELS[score] || STRENGTH_LEVELS[0];
}

/**
 * Check if a password meets minimum security requirements
 */
export function meetsMinimumRequirements(password: string): boolean {
  const strength = analyzePasswordStrength(password);
  return strength.score >= 2 && password.length >= 8;
}
