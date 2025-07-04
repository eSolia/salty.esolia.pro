#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Build script to generate HTML files from Vento templates
 *
 * This script:
 * 1. Loads language files (ja.json, en.json)
 * 2. Processes the Vento template with each language
 * 3. Generates index.html and en/index.html
 */

import vento from "jsr:@vento/vento@^1.12.0";
import { join } from "jsr:@std/path@^1.0.0";

// Initialize Vento with security settings
const ventoEngine = vento({
  dataVarname: "data",
  autoescape: true, // Auto-escape HTML entities for security
});

// Custom filters
ventoEngine.filters.jsonStringify = (value: unknown, indent = 2) => {
  if (value === null || value === undefined) return "null";
  return JSON.stringify(value, null, indent);
};

// Helper to read JSON files
async function readJSON(path: string): Promise<Record<string, unknown>> {
  const content = await Deno.readTextFile(path);
  return JSON.parse(content);
}

// Helper to ensure directory exists
async function ensureDir(path: string) {
  try {
    await Deno.mkdir(path, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}

// Main build function
async function build() {
  console.log("🔨 Building HTML files from templates...");

  try {
    // Load template
    const templatePath = join("templates", "index.vto");
    const template = await Deno.readTextFile(templatePath);

    // Load language files
    const languages = [
      { code: "ja", path: "index.html", langPath: "en" },
      { code: "en", path: "en/index.html", langPath: ".." },
    ];

    for (const lang of languages) {
      console.log(`  📝 Building ${lang.code} version...`);

      // Load language data
      const localeData = await readJSON(join("locales", `${lang.code}.json`));

      // Prepare template data - flatten the structure
      const templateData = {
        ...localeData,
        lang: lang.code,
        langPath: lang.langPath,
      };

      // Process template
      const result = await ventoEngine.runString(template, templateData);
      const html = result.content;

      // Ensure output directory exists
      const outputDir = lang.path.includes("/") ? lang.path.split("/")[0] : ".";
      if (outputDir !== ".") {
        await ensureDir(outputDir);
      }

      // Write output file
      await Deno.writeTextFile(lang.path, html);
      console.log(`  ✅ Generated ${lang.path}`);
    }

    console.log("\n✨ Build completed successfully!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Build failed:", errorMessage);

    // Provide helpful hints for common Vento errors
    if (errorMessage.includes("|")) {
      console.error("\n💡 Hint: Use |> for filters in Vento, not |");
      console.error("   Example: {{ value |> jsonStringify |> safe }}");
    }

    Deno.exit(1);
  }
}

// Validation function to check template for common issues
async function validateTemplate(templatePath: string) {
  const content = await Deno.readTextFile(templatePath);

  // Check for single pipe usage (common mistake)
  const singlePipeRegex = /\{\{[^}]*\|[^>][^}]*\}\}/g;
  const matches = content.match(singlePipeRegex);

  if (matches) {
    console.warn("⚠️  Warning: Found potential single pipe usage in template:");
    matches.forEach((match) => {
      console.warn(`   ${match}`);
    });
    console.warn("   Remember to use |> for Vento filters!");
  }
}

// Run build
if (import.meta.main) {
  // Validate template first
  await validateTemplate(join("templates", "index.vto"));

  // Run build
  await build();
}
