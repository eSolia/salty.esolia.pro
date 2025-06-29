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

// If no --config flag is present, add it
if (!args.includes("--config") && !args.includes("-c")) {
  args.push("--config", "./nagare.config.ts");
}

await cli(args);
