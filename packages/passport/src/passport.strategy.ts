import { Strategy } from "passport";
import { GlobalArtAuthStrategy } from "./common.strategy";
import { Request, Response } from "express";
import type {
  OpenIDConnectStrategyOptions,
  GlobalArtUserInfo,
  TokenResponse,
} from "./types";

interface AuthenticateOptions {
  state?: string;
  nonce?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  prompt?: string;
}

export interface PassportGlobalArtOptions extends OpenIDConnectStrategyOptions {
  passReqToCallback?: boolean;
}

export class GlobalArtPassportStrategy extends Strategy {
  public readonly name = "globalart";
  private readonly authStrategy: GlobalArtAuthStrategy;

  private verifyFn: (
    req: Request,
    accessToken: string,
    refreshToken: string | undefined,
    profile: GlobalArtUserInfo,
    done: (error: Error | null, user?: GlobalArtUserInfo) => void
  ) => void;

  constructor(
    options: PassportGlobalArtOptions,
    verify: (
      req: Request,
      accessToken: string,
      refreshToken: string | undefined,
      profile: GlobalArtUserInfo,
      done: (error: Error | null, user?: GlobalArtUserInfo) => void
    ) => void
  ) {
    super();
    this.authStrategy = new GlobalArtAuthStrategy(options);
    this.verifyFn = verify;
  }

  authenticate(req: Request, options?: AuthenticateOptions): void {
    if (req.query && req.query.code) {
      this.handleCallback(req);
    } else {
      this.handleRedirectToAuthorization(options);
    }
  }

  handleRedirectToAuthorization(options?: AuthenticateOptions) {
    this.authStrategy
      .initialize()
      .then(() => {
        const authUrl = this.authStrategy.generateAuthorizationUrl(options);
        this.redirect(authUrl);
      })
      .catch((err: Error) => {
        this.error(err);
      });
  }

  handleCallback(req: Request): void {
    this.authStrategy
      .initialize()
      .then(() =>
        this.authStrategy.exchangeCodeForToken(
          req.query.code as string,
          req.query.codeVerifier as string
        )
      )
      .then((tokenResponse: TokenResponse) =>
        this.authStrategy
          .getUserInfo(tokenResponse.access_token)
          .then((userInfo: GlobalArtUserInfo) => ({ tokenResponse, userInfo }))
      )
      .then(
        ({
          tokenResponse,
          userInfo,
        }: {
          tokenResponse: TokenResponse;
          userInfo: GlobalArtUserInfo;
        }) => {
          this.verifyFn(
            req,
            tokenResponse.access_token,
            tokenResponse.refresh_token,
            userInfo,
            (error, user) => {
              if (error) {
                return this.error(error);
              }
              if (!user) {
                return this.fail("Authentication failed");
              }

              return this.success(user);
            }
          );
        }
      )
      .catch((err: Error) => {
        return this.error(err);
      });
  }

  redirect(url: string): void {
    const res = this.getResponse();
    if (!res) throw new Error("Response not available");
    res.redirect(url);
  }

  success(user: GlobalArtUserInfo): void {
    const res = this.getResponse();
    if (!res) throw new Error("Response not available");
    res.locals.user = user;
  }

  fail(message: string): void {
    const res = this.getResponse();
    if (!res) throw new Error("Response not available");
    res.status(401).send({ error: message });
  }

  error(err: Error): void {
    const res = this.getResponse();
    if (!res) throw new Error("Response not available");
    res.status(500).send({ error: err instanceof Error ? err.message : err });
  }

  private getResponse(): Response {
    const http = (global as any).__passport_http__;
    if (!http || !http.res) throw new Error("Response not available");
    return http.res;
  }
}
