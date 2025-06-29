#!/usr/bin/env deno run -A
import { cli } from "@rick/nagare/cli";

// Pass through all arguments, but ensure config is specified if not provided
const args = [...Deno.args];

// Check if --config or -c is already in the arguments
const hasConfig = args.some((arg, i) =>
  (arg === "--config" || arg === "-c") && args[i + 1]
);

// If no config specified, add it
if (!hasConfig) {
  // Insert --config after the command (if any)
  const commandIndex = args.findIndex((arg) => !arg.startsWith("-"));
  if (commandIndex >= 0) {
    args.splice(commandIndex + 1, 0, "--config", "./nagare.config.ts");
  } else {
    args.unshift("--config", "./nagare.config.ts");
  }
}

await cli(args);
