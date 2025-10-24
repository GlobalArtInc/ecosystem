import { SessionUser } from "../session.service";

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
    isAuthenticated?: boolean;
  }
}
