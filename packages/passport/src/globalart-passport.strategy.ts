import { Strategy } from "passport";
import { GlobalArtStrategy } from "./globalart-passport-auth.strategy";
import { Request, Response } from "express";
import type {
  OpenIDConnectStrategyOptions,
  UserInfo,
} from "./globalart-passport.types";

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

export class PassportGlobalArtStrategy extends Strategy {
  private globalArtStrategy: GlobalArtStrategy;
  public name = "globalart";

  private verifyFn: (
    req: Request,
    accessToken: string,
    refreshToken: string | undefined,
    profile: UserInfo,
    done: (error: Error | null, user?: UserInfo) => void
  ) => void;

  constructor(
    options: PassportGlobalArtOptions,
    verify: (
      req: Request,
      accessToken: string,
      refreshToken: string | undefined,
      profile: UserInfo,
      done: (error: Error | null, user?: UserInfo) => void
    ) => void
  ) {
    super();
    this.globalArtStrategy = new GlobalArtStrategy(options);
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
    this.globalArtStrategy
      .initialize()
      .then(() => {
        const authUrl =
          this.globalArtStrategy.generateAuthorizationUrl(options);
        this.redirect(authUrl);
      })
      .catch((err) => {
        this.error(err);
      });
  }

  handleCallback(req: Request): void {
    this.globalArtStrategy
      .initialize()
      .then(() =>
        this.globalArtStrategy.exchangeCodeForToken(
          req.query.code as string,
          req.query.codeVerifier as string
        )
      )
      .then((tokenResponse) =>
        this.globalArtStrategy
          .getUserInfo(tokenResponse.access_token)
          .then((userInfo) => ({ tokenResponse, userInfo }))
      )
      .then(({ tokenResponse, userInfo }) => {
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
      })
      .catch((err) => {
        return this.error(err);
      });
  }

  redirect(url: string): void {
    const res = this.getResponse();
    if (!res) throw new Error("Response not available");
    res.redirect(url);
  }

  success(user: UserInfo): void {
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
