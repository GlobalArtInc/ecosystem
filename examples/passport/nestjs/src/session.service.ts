import { Injectable } from "@nestjs/common";
import { Request } from "express";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class SessionService {
  saveUserSession(req: Request, user: SessionUser): void {
    req.session.user = user;
    req.session.isAuthenticated = true;
  }

  getUserSession(req: Request): SessionUser | null {
    return req.session.user || null;
  }

  isAuthenticated(req: Request): boolean {
    return req.session.isAuthenticated === true;
  }

  clearSession(req: Request): void {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error while destroying session:", err);
      }
    });
  }

  updateUserSession(req: Request, updates: Partial<SessionUser>): void {
    if (req.session.user) {
      req.session.user = { ...req.session.user, ...updates };
    }
  }
}
