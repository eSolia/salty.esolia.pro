import { TemplateFormat } from "@rick/nagare/types";
import type { NagareConfig } from "@rick/nagare/types";

export default {
  project: {
    name: "Salty",
    description: "Browser-Native Secure Text Encryption",
    repository: "https://github.com/esolia/salty.esolia.pro",
    homepage: "https://salty.esolia.pro",
    license: "MIT",
    author: "Rick Cogley, eSolia Inc.",
  },

  versionFile: {
    path: "./version.ts",
    template: TemplateFormat.TYPESCRIPT,
  },

  // Much simpler with Nagare 1.1.0+ - just list the files!
  updateFiles: [
    { path: "./deno.json" }, // Auto-detected and handled by built-in handler
    { path: "./README.md" }, // Auto-detected and handled by built-in handler
  ],

  // Configure GitHub release
  github: {
    owner: "esolia",
    repo: "salty.esolia.pro",
    createRelease: true,
  },
} satisfies NagareConfig;
