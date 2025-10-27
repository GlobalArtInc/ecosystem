import { AccessTokenUserInfo, UserInfo } from "./types";

export class UserMapper {
  static toUserInfo(userInfo: AccessTokenUserInfo): UserInfo {
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
