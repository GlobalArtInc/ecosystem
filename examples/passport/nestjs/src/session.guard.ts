import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { SessionService } from "./session.service";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!this.sessionService.isAuthenticated(request)) {
      throw new UnauthorizedException("User is not authenticated");
    }

    return true;
  }
}
