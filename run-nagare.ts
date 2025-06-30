#!/usr/bin/env deno run -A
import { cli } from "@rick/nagare/cli";

const args = [...Deno.args];

const hasConfig = args.some((arg, i) =>
  (arg === "--config" || arg === "-c") && args[i + 1]
);

if (!hasConfig) {
  // Construct an absolute path to nagare.config.ts
  // Deno.cwd() gives the current working directory
  const configPath = Deno.cwd() + "/nagare.config.ts";

  const commandIndex = args.findIndex((arg) => !arg.startsWith("-"));
  if (commandIndex >= 0) {
    args.splice(commandIndex + 1, 0, "--config", configPath);
  } else {
    args.unshift("--config", configPath);
  }
}

await cli(args);
