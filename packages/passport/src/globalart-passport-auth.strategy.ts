import type {
  OpenIDConnectConfig,
  OpenIDConnectStrategyOptions,
  TokenResponse,
  UserInfo,
  AuthorizationUrlOptions,
  AccessTokenUserInfo,
} from "./globalart-passport.types";
import fetch from "node-fetch";
import { URLSearchParams } from "url";
import { Buffer } from "buffer";
import { GlobalArtPassportMapper } from "./globalart-passport.mapper";

export class GlobalArtStrategy {
  private config: OpenIDConnectConfig | null = null;
  private options: OpenIDConnectStrategyOptions;

  constructor(options: OpenIDConnectStrategyOptions) {
    this.options = {
      scope: ["openid", "profile", "email"],
      responseType: "code",
      responseMode: "query",
      discoveryUrl:
        "https://sso.globalart.dev/.well-known/openid-configuration",
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const response = await fetch(this.options.discoveryUrl!);
      if (!response.ok) {
        throw new Error(
          `Failed to load OpenID Connect configuration: ${response.statusText}`
        );
      }
      this.config = (await response.json()) as OpenIDConnectConfig;
    } catch (error) {
      throw new Error(
        `Failed to initialize OpenID Connect strategy: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  generateAuthorizationUrl(options: AuthorizationUrlOptions = {}): string {
    if (!this.config) {
      throw new Error("Strategy not initialized. Call initialize() first.");
    }

    const params = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.redirectUri,
      response_type: this.options.responseType!,
      scope: this.options.scope!.join(" "),
      ...(this.options.responseMode && {
        response_mode: this.options.responseMode,
      }),
      ...(options.state && { state: options.state }),
      ...(options.nonce && { nonce: options.nonce }),
      ...(options.codeChallenge && { code_challenge: options.codeChallenge }),
      ...(options.codeChallengeMethod && {
        code_challenge_method: options.codeChallengeMethod,
      }),
      ...(options.prompt && { prompt: options.prompt }),
      ...(options.maxAge && { max_age: options.maxAge.toString() }),
      ...(options.loginHint && { login_hint: options.loginHint }),
      ...(options.acrValues && { acr_values: options.acrValues }),
    });

    return `${this.config.authorization_endpoint}?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    codeVerifier?: string
  ): Promise<TokenResponse> {
    if (!this.config) {
      throw new Error("Strategy not initialized. Call initialize() first.");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      code: code,
      redirect_uri: this.options.redirectUri,
      ...(codeVerifier && { code_verifier: codeVerifier }),
    });

    try {
      const response = await fetch(this.config.token_endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token exchange failed: ${response.status} ${errorText}`
        );
      }

      return (await response.json()) as TokenResponse;
    } catch (error) {
      throw new Error(
        `Failed to exchange code for token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    if (!this.config) {
      throw new Error("Strategy not initialized. Call initialize() first.");
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      refresh_token: refreshToken,
    });

    try {
      const response = await fetch(this.config.token_endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token refresh failed: ${response.status} ${errorText}`
        );
      }

      return (await response.json()) as TokenResponse;
    } catch (error) {
      throw new Error(
        `Failed to refresh token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    if (!this.config) {
      throw new Error("Strategy not initialized. Call initialize() first.");
    }

    try {
      const response = await fetch(this.config.userinfo_endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to get user info: ${response.status} ${errorText}`
        );
      }
      const userInfo = (await response.json()) as AccessTokenUserInfo;

      return GlobalArtPassportMapper.toUserInfo(userInfo);
    } catch (error) {
      throw new Error(
        `Failed to get user info: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async revokeToken(token: string, tokenTypeHint?: string): Promise<void> {
    if (!this.config) {
      throw new Error("Strategy not initialized. Call initialize() first.");
    }

    const body = new URLSearchParams({
      token: token,
      ...(tokenTypeHint && { token_type_hint: tokenTypeHint }),
    });

    try {
      const response = await fetch(this.config.revocation_endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${this.options.clientId}:${this.options.clientSecret}`
          ).toString("base64")}`,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token revocation failed: ${response.status} ${errorText}`
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to revoke token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  getConfiguration(): OpenIDConnectConfig | null {
    return this.config;
  }
}
