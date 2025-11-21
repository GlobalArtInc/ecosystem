import { GlobalArtAuthStrategy } from "@globalart/passport";
import { randomBytes, createHash } from "crypto";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

async function demonstrateAuthFlow() {
  console.log("🚀 GlobalArt Passport Strategy Demonstration");
  console.log("==========================================");

  const strategy = new GlobalArtAuthStrategy({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
    scope: ["openid", "profile", "email"],
  });

  try {
    console.log("📡 Initializing strategy...");
    await strategy.initialize();
    console.log("✅ Strategy successfully initialized");

    const state = randomBytes(32).toString("hex");
    const nonce = randomBytes(32).toString("hex");

    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    console.log("\n🔐 Generating authorization URL...");
    const authUrl = strategy.generateAuthorizationUrl({
      state,
      nonce,
      codeChallenge,
      codeChallengeMethod: "S256",
      prompt: "login",
    });

    console.log("🌐 Authorization URL:");
    console.log(authUrl);
    console.log("\n📝 Testing parameters:");
    console.log(`State: ${state}`);
    console.log(`Nonce: ${nonce}`);
    console.log(`Code Verifier: ${codeVerifier}`);
    console.log(`Code Challenge: ${codeChallenge}`);

    const config = strategy.getConfiguration();
    if (config) {
      console.log("\n📋 OpenID Connect Configuration:");
      console.log(`Issuer: ${config.issuer}`);
      console.log(`Supported scopes: ${config.scopes_supported.join(", ")}`);
      console.log(
        `Supported response types: ${config.response_types_supported.join(
          ", "
        )}`
      );
      console.log(
        `Supported algorithms: ${config.id_token_signing_alg_values_supported.join(
          ", "
        )}`
      );
    }

    console.log("\n💡 To test the complete flow:");
    console.log("1. Navigate to the URL above");
    console.log("2. Authorize in GlobalArt SSO");
    console.log("3. Copy the code from callback URL");
    console.log("4. Use handleCallback() function with the received code");
  } catch (error) {
    console.error("❌ Initialization error:", error);
  }
}

async function handleCallback(
  code: string,
  state: string,
  codeVerifier: string
) {
  console.log("\n🔄 Processing callback...");

  const strategy = new GlobalArtAuthStrategy({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
  });

  try {
    await strategy.initialize();

    console.log("🔄 Exchanging code for tokens...");
    const tokenResponse = await strategy.exchangeCodeForToken(
      code,
      codeVerifier
    );

    console.log("✅ Tokens received:");
    console.log(
      `Access Token: ${tokenResponse.access_token.substring(0, 20)}...`
    );
    console.log(`Token Type: ${tokenResponse.token_type}`);
    console.log(`Expires In: ${tokenResponse.expires_in} seconds`);
    console.log(`Has Refresh Token: ${!!tokenResponse.refresh_token}`);
    console.log(`Has ID Token: ${!!tokenResponse.id_token}`);

    console.log("\n👤 Getting user information...");
    const userInfo = await strategy.getUserInfo(tokenResponse.access_token);
    console.log("✅ User information:");
    console.log(`Subject ID: ${userInfo.id}`);
    console.log(`Email: ${userInfo.email || "Not specified"}`);
    console.log(`Name: ${userInfo.name || "Not specified"}`);

    if (tokenResponse.refresh_token) {
      console.log("\n🔄 Testing token refresh...");
      const refreshedTokens = await strategy.refreshToken(
        tokenResponse.refresh_token
      );
      console.log("✅ Token refreshed:");
      console.log(
        `New Access Token: ${refreshedTokens.access_token.substring(0, 20)}...`
      );
      console.log(`Expires In: ${refreshedTokens.expires_in} seconds`);
    }

    console.log("\n🎉 Authorization completed successfully!");
  } catch (error) {
    console.error("❌ Callback processing error:", error);
  }
}

async function revokeTokenExample(accessToken: string) {
  console.log("\n🗑️ Revoking token...");

  const strategy = new GlobalArtAuthStrategy({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
  });

  try {
    await strategy.initialize();
    await strategy.revokeToken(accessToken, "access_token");
    console.log("✅ Token successfully revoked");
  } catch (error) {
    console.error("❌ Token revocation error:", error);
  }
}

if (require.main === module) {
  demonstrateAuthFlow().catch(console.error);
}

export { demonstrateAuthFlow, handleCallback, revokeTokenExample };
