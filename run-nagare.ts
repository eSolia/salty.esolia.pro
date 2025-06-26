#!/usr/bin/env deno run -A
import { cli } from "jsr:@rick/nagare/cli";
await cli(Deno.args);
