import { AccessTokenUserInfo, UserInfo } from "./types";

export class UserMapper {
  static toUserInfo(userInfo: AccessTokenUserInfo): UserInfo {
    return {
      id: parseInt(userInfo.sub),
      email: userInfo.email!,
      name: userInfo.name!,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      locale: userInfo.locale,
    };
  }
}
