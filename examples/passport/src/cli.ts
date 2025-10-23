#!/usr/bin/env node

import {
  demonstrateAuthFlow,
  handleCallback,
  revokeTokenExample,
} from "./index";

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (command) {
    case "start":
      console.log("🚀 Starting authorization demonstration...");
      await demonstrateAuthFlow();
      break;

    case "callback":
      if (args.length < 1) {
        console.error(
          "❌ Usage: pnpm cli callback <code> [state] [codeVerifier]"
        );
        process.exit(1);
      }
      const [code, state = "", codeVerifier = ""] = args;
      console.log("🔄 Processing callback...");
      await handleCallback(code, state, codeVerifier);
      break;

    case "revoke":
      if (args.length < 1) {
        console.error("❌ Usage: pnpm cli revoke <accessToken>");
        process.exit(1);
      }
      const [accessToken] = args;
      console.log("🗑️ Revoking token...");
      await revokeTokenExample(accessToken);
      break;

    case "help":
    case "--help":
    case "-h":
      console.log(`
🔐 GlobalArt Passport CLI

Commands:
  demo, demonstrate    - Start authorization demonstration
  callback <code> [state] [codeVerifier] - Process callback with tokens
  revoke <accessToken> - Revoke access token
  help                - Show this help message

Examples:
  pnpm cli start
  pnpm cli callback "abc123"
  pnpm cli revoke "eyJhbGciOiJSUzI1NiIs..."
      `);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log("Use 'pnpm cli help' for help");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
