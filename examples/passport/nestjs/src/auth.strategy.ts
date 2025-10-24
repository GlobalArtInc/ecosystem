import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { PassportGlobalArtStrategy } from "@globalart/passport";

@Injectable()
export class GlobalArtAuthStrategy extends PassportStrategy(
  PassportGlobalArtStrategy,
  "globalart"
) {
  constructor() {
    super({
      clientId: "6ba65d2c-19ab-4c23-81fe-daac90892857",
      clientSecret:
        "90d88aef5176a0623f4faf1b273391cacea7d888adf8a9990cef62f68c3557ed",
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
    done(null, profile);
  }
}
