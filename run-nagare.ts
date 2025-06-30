#!/usr/bin/env deno run -A
import { cli } from "@rick/nagare/cli";
// Pass through all arguments.
// The Nagare CLI's loadConfig function already looks for
// nagare.config.ts in the current working directory by default.
// By NOT explicitly adding --config here, we let it use
// its default search.
await cli(Deno.args);
