import { AccessTokenUserInfo, GlobalArtUserInfo } from "./types";

export class UserMapper {
  static toUserInfo(userInfo: AccessTokenUserInfo): GlobalArtUserInfo {
    return {
      id: parseInt(userInfo.sub),
      email: userInfo.email!,
      name: userInfo.name!,
      given_name: userInfo.given_name,
      family_name: userInfo.family_name,
      preferred_username: userInfo.preferred_username,
      locale: userInfo.locale,
    };
  }
}
