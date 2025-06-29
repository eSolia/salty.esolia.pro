#!/usr/bin/env deno run -A
import { cli } from "@rick/nagare/cli";

// Always add the config path to ensure it's found
const args = [...Deno.args];

// Debug: show current directory
console.log("Running from:", Deno.cwd());
console.log(
  "Config file exists:",
  await Deno.stat("./nagare.config.ts").then(() => true).catch(() => false),
);

// If no --config flag is present, add it with absolute path
if (!args.includes("--config") && !args.includes("-c")) {
  // Use absolute path instead of relative
  const absolutePath = new URL("./nagare.config.ts", `file://${Deno.cwd()}/`).href;
  console.log("Using absolute path:", absolutePath);
  args.push("--config", absolutePath);
}

await cli(args);