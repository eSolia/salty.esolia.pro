#!/usr/bin/env -S deno run --allow-read --allow-env

/**
 * @fileoverview Security pattern checker for Salty codebase
 * @description Scans TypeScript files for dangerous patterns, potential security vulnerabilities,
 *              and code that could lead to ReDoS or other security issues
 */

import { logger } from "../logger.ts";

interface PatternCheck {
  file: string;
  line: number;
  pattern: string;
  type: "regex" | "code" | "import";
  severity: "error" | "warning" | "info";
  message: string;
}

// Known dangerous patterns to check for
const DANGEROUS_PATTERNS = [
  // ReDoS vulnerable patterns
  {
    regex: /(\\.\*)+/,
    message: "Nested quantifiers can cause ReDoS",
    severity: "error" as const,
  },
  {
    regex: /(\[[^\]]*\]|\([^)]*\))\+\+/,
    message: "Possessive quantifiers can cause ReDoS",
    severity: "error" as const,
  },
  {
    regex: /\(.*\)\{(\d+,\d*|\d*,\d+)\}/,
    message: "Large range quantifiers can cause performance issues",
    severity: "warning" as const,
  },
  // Security-sensitive patterns
  {
    regex: /eval\s*\(/,
    message: "eval() is dangerous and should not be used",
    severity: "error" as const,
  },
  {
    regex: /new\s+Function\s*\(/,
    message: "Function constructor can execute arbitrary code",
    severity: "error" as const,
  },
  {
    regex: /innerHTML\s*=/,
    message: "innerHTML can lead to XSS vulnerabilities",
    severity: "error" as const,
  },
  {
    regex: /document\.write/,
    message: "document.write can be dangerous",
    severity: "warning" as const,
  },
  // Crypto-specific patterns
  {
    regex: /Math\.random\(\)/,
    message: "Math.random() is not cryptographically secure",
    severity: "error" as const,
  },
  {
    regex: /\bMD5\b|\bSHA1\b/i,
    message: "Weak hash algorithms detected",
    severity: "error" as const,
  },
  // Shell injection risks
  {
    regex: /exec\s*\(|execSync\s*\(/,
    message: "Shell execution can lead to command injection",
    severity: "error" as const,
  },
];

// Import patterns to check
const SUSPICIOUS_IMPORTS = [
  {
    pattern: "child_process",
    message: "Shell execution module imported",
    severity: "warning" as const,
  },
  {
    pattern: "vm",
    message: "VM module can execute arbitrary code",
    severity: "error" as const,
  },
  {
    pattern: "dgram",
    message: "UDP module imported - ensure proper validation",
    severity: "info" as const,
  },
];

// File patterns to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git/,
  /_test\.ts$/,
  /test\//,
  /\.md$/,
  /check-patterns\.ts$/, // Don't check self
];

/**
 * Main pattern checking function
 */
async function checkPatterns(): Promise<void> {
  const results: PatternCheck[] = [];
  let errorCount = 0;
  let warningCount = 0;

  console.log("🔍 Salty Security Pattern Check\n");

  // Recursively find all TypeScript files
  const files = await findTypeScriptFiles(".");
  
  console.log(`Found ${files.length} TypeScript files to check\n`);

  // Check each file
  for (const file of files) {
    await checkFile(file, results);
  }

  // Report results
  const errors = results.filter(r => r.severity === "error");
  const warnings = results.filter(r => r.severity === "warning");
  const infos = results.filter(r => r.severity === "info");

  if (errors.length > 0) {
    console.error(`\n❌ Found ${errors.length} error(s):\n`);
    for (const error of errors) {
      console.error(`  ${error.file}:${error.line}`);
      console.error(`    Pattern: ${error.pattern}`);
      console.error(`    Issue: ${error.message}\n`);
    }
    errorCount = errors.length;
  }

  if (warnings.length > 0) {
    console.warn(`\n⚠️  Found ${warnings.length} warning(s):\n`);
    for (const warning of warnings) {
      console.warn(`  ${warning.file}:${warning.line}`);
      console.warn(`    Pattern: ${warning.pattern}`);
      console.warn(`    Issue: ${warning.message}\n`);
    }
    warningCount = warnings.length;
  }

  if (infos.length > 0 && Deno.env.get("VERBOSE")) {
    console.log(`\nℹ️  Found ${infos.length} info message(s):\n`);
    for (const info of infos) {
      console.log(`  ${info.file}:${info.line}`);
      console.log(`    Pattern: ${info.pattern}`);
      console.log(`    Note: ${info.message}\n`);
    }
  }

  // Check for specific crypto security
  console.log("\n🔐 Crypto Security Checks:\n");
  await checkCryptoSecurity(files);

  // Summary
  console.log("\n📊 Summary:");
  console.log(`  Files checked: ${files.length}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Warnings: ${warningCount}`);
  console.log(`  Info: ${infos.length}`);

  if (errorCount > 0) {
    console.error("\n❌ Security pattern check failed!");
    console.error("Please fix the errors before proceeding.");
    Deno.exit(1);
  } else if (warningCount > 0) {
    console.warn("\n⚠️  Security pattern check passed with warnings.");
    console.warn("Consider addressing the warnings.");
  } else {
    console.log("\n✅ All security pattern checks passed!");
  }
}

/**
 * Recursively find TypeScript files
 */
async function findTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`;
      
      // Skip if matches skip pattern
      if (SKIP_PATTERNS.some(pattern => pattern.test(path))) {
        continue;
      }

      if (entry.isDirectory) {
        const subFiles = await findTypeScriptFiles(path);
        files.push(...subFiles);
      } else if (entry.isFile && entry.name.endsWith(".ts")) {
        files.push(path);
      }
    }
  } catch (error) {
    // Directory might not exist or be accessible
    if (error instanceof Deno.errors.NotFound) {
      return files;
    }
    throw error;
  }

  return files;
}

/**
 * Check a single file for patterns
 */
async function checkFile(filePath: string, results: PatternCheck[]): Promise<void> {
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
      return;
    }

    // Skip security pattern definitions (these are patterns we check FOR, not vulnerabilities)
    if (filePath.includes("security-utils") && (
      line.includes("DANGEROUS_PATTERNS") || 
      line.includes("SHELL_METACHARACTERS") ||
      line.trim().startsWith("/") && line.trim().endsWith(",") // Pattern in array
    )) {
      return;
    }

    // Check for dangerous patterns in code
    for (const dangerous of DANGEROUS_PATTERNS) {
      if (dangerous.regex.test(line)) {
        const match = line.match(dangerous.regex);
        if (match) {
          results.push({
            file: filePath,
            line: lineNum,
            pattern: match[0],
            type: "code",
            severity: dangerous.severity,
            message: dangerous.message,
          });
        }
      }
    }

    // Check for regex literals (improved detection)
    // Avoid matching division operators and URLs
    const regexLiteral = /(?:^|[^<])\/([^\/\n*]+)\/([gimuy]*)\s*[,;)\]}]|(?:=|:|\()\s*\/([^\/\n*]+)\/([gimuy]*)/g;
    let match;
    while ((match = regexLiteral.exec(line)) !== null) {
      const pattern = match[1] || match[3];
      const flags = match[2] || match[4];

      // Skip if it looks like a URL or file path
      if (pattern.includes('http') || pattern.includes('.com') || pattern.includes('.ts') || pattern.includes('.js')) {
        continue;
      }

      // Skip known safe patterns in security-utils.ts
      if (filePath.includes("security-utils") && (
        pattern === "on\\w+\\s*=" || // Event handler pattern
        pattern.includes("A-Za-z0-9") // Base91 pattern
      )) {
        continue;
      }

      // Check if it's a valid regex
      try {
        new RegExp(pattern, flags);
        
        // Check for ReDoS vulnerable patterns
        if (checkReDoS(pattern)) {
          results.push({
            file: filePath,
            line: lineNum,
            pattern: `/${pattern}/${flags}`,
            type: "regex",
            severity: "error",
            message: "Potential ReDoS vulnerability",
          });
        }
      } catch {
        // Invalid regex, skip
      }
    }

    // Check imports
    const importMatch = line.match(/import\s+.*from\s+["']([^"']+)["']/);
    if (importMatch) {
      const importPath = importMatch[1];
      for (const suspicious of SUSPICIOUS_IMPORTS) {
        if (importPath.includes(suspicious.pattern)) {
          results.push({
            file: filePath,
            line: lineNum,
            pattern: importPath,
            type: "import",
            severity: suspicious.severity,
            message: suspicious.message,
          });
        }
      }
    }
  });
}

/**
 * Check for ReDoS vulnerable patterns
 */
function checkReDoS(pattern: string): boolean {
  // Skip simple patterns that are safe
  if (pattern.length < 5 || !/[*+{]/.test(pattern)) {
    return false;
  }

  // Skip patterns that are clearly safe
  if (
    pattern === "\\s*" || // Common whitespace pattern
    pattern === ".{1,2}" || // Fixed repetition
    /^\^[^$*+{]+\$?$/.test(pattern) || // Anchored without quantifiers in middle
    /^\[[^\]]+\]$/.test(pattern) || // Simple character class
    /^on\\w\+\\s\*=$/.test(pattern) || // Event handler pattern (safe)
    /^\^?\[[^\]]+\]\+\$?$/.test(pattern) // Character class with + at end
  ) {
    return false;
  }

  // Check for nested quantifiers like (a+)+
  if (/(\([^)]*[*+]\)[*+])|(\[[^\]]*[*+]\][*+])/.test(pattern)) {
    return true;
  }

  // Check for exponential patterns like (a*)*
  if (/\([^)]*\*\)\*/.test(pattern)) {
    return true;
  }

  // Check for alternation with overlapping that can backtrack
  if (/\(([^|)]+)\|([^|)]+)\)[*+]/.test(pattern)) {
    // Check if alternatives can match same input
    const match = pattern.match(/\(([^|)]+)\|([^|)]+)\)[*+]/);
    if (match && match[1].includes('.') && match[2].includes('.')) {
      return true;
    }
  }

  // Check for catastrophic backtracking patterns
  if (/(.+){10,}|(.+)\+\+/.test(pattern)) {
    return true;
  }

  // Check for patterns like (.*)*
  if (/\(\.\*\)\*|\(\.\+\)\+/.test(pattern)) {
    return true;
  }

  return false;
}

/**
 * Check crypto-specific security concerns
 */
async function checkCryptoSecurity(files: string[]): Promise<void> {
  let hasIssues = false;

  // Check salty.ts specifically
  const saltyFile = files.find(f => f.includes("salty.ts") && !f.includes("test"));
  if (saltyFile) {
    const content = await Deno.readTextFile(saltyFile);
    
    // Check for proper crypto usage
    if (!content.includes("crypto.subtle")) {
      console.error("  ❌ Not using Web Crypto API");
      hasIssues = true;
    } else {
      console.log("  ✅ Using Web Crypto API");
    }

    if (!content.includes("AES-GCM")) {
      console.error("  ❌ Not using AES-GCM encryption");
      hasIssues = true;
    } else {
      console.log("  ✅ Using AES-GCM encryption");
    }

    if (!content.includes("PBKDF2")) {
      console.error("  ❌ Not using PBKDF2 for key derivation");
      hasIssues = true;
    } else {
      console.log("  ✅ Using PBKDF2 for key derivation");
    }

    // Check iteration count
    const iterMatch = content.match(/iterations:\s*(\d+)/);
    if (iterMatch) {
      const iterations = parseInt(iterMatch[1]);
      if (iterations < 100000) {
        console.error(`  ❌ PBKDF2 iterations too low: ${iterations} (minimum: 100000)`);
        hasIssues = true;
      } else {
        console.log(`  ✅ PBKDF2 iterations: ${iterations}`);
      }
    }
  }

  // Check for hardcoded secrets
  for (const file of files) {
    const content = await Deno.readTextFile(file);
    
    // Skip test files for this check
    if (file.includes("test")) continue;

    const secretPatterns = [
      /(?:api[_-]?key|apikey|password|secret|token)\s*[:=]\s*["'][^"']{8,}["']/i,
      /(?:PRIVATE|SECRET)_KEY\s*=\s*["'][^"']+["']/,
      /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        console.error(`  ❌ Possible hardcoded secret in ${file}`);
        hasIssues = true;
        break;
      }
    }
  }

  if (!hasIssues) {
    console.log("  ✅ No crypto security issues found");
  }
}

// Run the check
if (import.meta.main) {
  await checkPatterns();
}