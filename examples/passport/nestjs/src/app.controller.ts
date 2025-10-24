import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";

@Controller()
export class AppController {
  @Get("login")
  @UseGuards(AuthGuard("globalart"))
  handleLogin(): string {
    return "Login";
  }

  @Get("callback")
  @UseGuards(AuthGuard("globalart"))
  handleCallback(@Req() req: Request) {
    return req.user;
  }
}
