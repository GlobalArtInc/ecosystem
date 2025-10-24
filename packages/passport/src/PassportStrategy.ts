import { Strategy } from "passport";
import { GlobalArtStrategy } from "./GlobalArtStrategy";
import type { OpenIDConnectStrategyOptions } from "./types";

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
    req: any,
    accessToken: string,
    refreshToken: string | undefined,
    profile: any,
    done: (error: any, user?: any) => void
  ) => void;

  constructor(
    options: PassportGlobalArtOptions,
    verify: (
      req: any,
      accessToken: string,
      refreshToken: string | undefined,
      profile: any,
      done: (error: any, user?: any) => void
    ) => void
  ) {
    super();
    this.globalArtStrategy = new GlobalArtStrategy(options);
    this.verifyFn = verify;
  }

  authenticate(req: any, options?: AuthenticateOptions): void {
    if (req.query && req.query.code) {
      this.handleCallback(
        req,
        req.query.code,
        req.query.state,
        req.query.codeVerifier
      );
    } else {
      this.globalArtStrategy
        .initialize()
        .then(() => {
          const authUrl = this.globalArtStrategy.generateAuthorizationUrl({
            state: options?.state,
            nonce: options?.nonce,
            codeChallenge: options?.codeChallenge,
            codeChallengeMethod: options?.codeChallengeMethod,
            prompt: options?.prompt,
          });
          this.redirect(authUrl);
        })
        .catch((err) => {
          this.error(err);
        });
    }
  }

  handleCallback(
    req: any,
    code: string,
    state: string,
    codeVerifier?: string
  ): void {
    this.globalArtStrategy
      .initialize()
      .then(() =>
        this.globalArtStrategy.exchangeCodeForToken(code, codeVerifier)
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
            if (error) return this.error(error);
            if (!user) return this.fail("Authentication failed");
            this.success(user);
          }
        );
      })
      .catch((err) => {
        this.error(err);
      });
  }

  redirect(url: string): void {
    const res = this.getResponse();
    if (!res) throw new Error("Response not available");
    res.redirect(url);
  }

  success(user: any): void {
    const res = this.getResponse();
    if (!res) throw new Error("Response not available");
    res.locals.user = user;
  }

  fail(message: string): void {
    const res = this.getResponse();
    if (!res) throw new Error("Response not available");
    res.status(401).send({ error: message });
  }

  error(err: any): void {
    const res = this.getResponse();
    if (!res) throw new Error("Response not available");
    res.status(500).send({ error: err instanceof Error ? err.message : err });
  }

  private getResponse(): any {
    const http = (global as any).__passport_http__;
    if (!http || !http.res) return null;
    return http.res;
  }
}
