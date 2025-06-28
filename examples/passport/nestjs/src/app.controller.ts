import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { SessionService } from "./session.service";
import { SessionGuard } from "./session.guard";

@Controller()
export class AppController {
  constructor(private readonly sessionService: SessionService) {}

  @Get("login")
  @UseGuards(AuthGuard("globalart"))
  handleLogin(): string {
    return "Login";
  }

  @Get("callback")
  @UseGuards(AuthGuard("globalart"))
  handleCallback(@Req() req: Request) {
    const user = this.sessionService.getUserSession(req);
    return {
      message: "Authorization successful",
      user,
    };
  }

  @Get("profile")
  @UseGuards(SessionGuard)
  getProfile(@Req() req: Request) {
    return this.sessionService.getUserSession(req);
  }

  @Post("logout")
  @UseGuards(SessionGuard)
  logout(@Req() req: Request) {
    this.sessionService.clearSession(req);
    return { message: "Logout successful" };
  }

  @Get("status")
  getAuthStatus(@Req() req: Request) {
    return {
      isAuthenticated: this.sessionService.isAuthenticated(req),
      user: this.sessionService.getUserSession(req),
    };
  }
}
