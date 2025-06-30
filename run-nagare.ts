#!/usr/bin/env deno run -A

// Get all arguments passed to this wrapper script
const args = Deno.args;

// Construct the absolute file:// URL for nagare.config.ts
// Deno.cwd() gives the current working directory (your project root)
const configAbsolutePath = Deno.cwd() + "/nagare.config.ts";
const configFileUrl = `file://${configAbsolutePath}`; // No need for new URL(...).href here, as cli.ts handles it

// Prepare the command to run the actual Nagare CLI from JSR
// We use Deno.execPath() to ensure we're using the same Deno executable
// and then specify the JSR module as the main script.
const command = [
  Deno.execPath(), // Path to the currently running Deno executable
  "run",
  "-A", // Pass --allow-all to the child process
  "jsr:@rick/nagare/cli", // The actual Nagare CLI entry point from JSR
];

// Always add the --config argument with the absolute file:// URL.
// We'll filter it out from the original args if it was already there,
// to avoid duplication, but ensure it's always the *absolute* path.
let finalArgs = [...args];
const configIndex = finalArgs.findIndex(
  (arg, i) => (arg === "--config" || arg === "-c") && finalArgs[i + 1],
);

if (configIndex !== -1) {
  // If --config was already provided, remove it and its value
  finalArgs.splice(configIndex, 2);
}

// Now, insert the --config argument with the absolute file:// URL.
// It's generally best to put it early, or rely on parseArgs to handle order.
// For simplicity, let's just prepend it or insert after the command.
const commandArgIndex = finalArgs.findIndex((arg) => !arg.startsWith("-"));
if (commandArgIndex !== -1) {
  finalArgs.splice(commandArgIndex + 1, 0, "--config", configFileUrl);
} else {
  // If no command is present (e.g., just --help), prepend it
  finalArgs.unshift("--config", configFileUrl);
}

// Add remaining arguments from the original Deno.args
command.push(...finalArgs);

// Execute the command
const cmd = new Deno.Command(command[0], {
  args: command.slice(1),
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const { code } = await cmd.output();
Deno.exit(code);
