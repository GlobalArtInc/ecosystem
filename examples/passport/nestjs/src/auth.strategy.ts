import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { GlobalArtPassportStrategy } from "@globalart/passport";
import { SessionService, SessionUser } from "./session.service";
import { Request } from "express";

@Injectable()
export class GlobalArtAuthStrategy extends PassportStrategy(
  GlobalArtPassportStrategy,
  "globalart"
) {
  constructor(private readonly sessionService: SessionService) {
    super({
      clientId: process.env.GLOBALART_CLIENT_ID,
      clientSecret: process.env.GLOBALART_CLIENT_SECRET,
      responseType: "code",
      scope: ["openid", "profile", "email"],
      redirectUri: "http://127.0.0.1:4500/callback",
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void
  ): any {
    console.log({
      accessToken,
      refreshToken,
      profile,
    });

    const sessionUser: SessionUser = {
      id: profile.id || profile.sub,
      email: profile.email,
      name: profile.name || profile.displayName,
      accessToken,
      refreshToken,
    };
    this.sessionService.saveUserSession(req, sessionUser);

    done(null, sessionUser);
  }
}
