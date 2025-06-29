#!/usr/bin/env deno run -A
import { cli } from "@rick/nagare/cli";

// Debug: show current directory
console.log("Running from:", Deno.cwd());
console.log("Config file exists:", await Deno.stat("./nagare.config.ts").then(() => true).catch(() => false));

await cli(Deno.args);