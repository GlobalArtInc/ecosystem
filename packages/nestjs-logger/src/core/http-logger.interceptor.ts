import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { LoggerService } from "./logger.service";
import { IDataSanitizer, IRequestIdGenerator } from "../contracts";
import {
  HttpRequestLogEntry,
  HttpRequest,
  HttpResponse,
  LoggerConfiguration,
  LogEntry,
  LogLevel,
  LogOptions,
} from "../types";
import { LOGGER_CONFIG_TOKEN, LOGGER_EXCLUDE_METADATA } from "../constants";
import { hostname } from "os";

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  private readonly hostname = hostname();
  private readonly pid = process.pid;

  constructor(
    private readonly logger: LoggerService,
    private readonly dataSanitizer: IDataSanitizer,
    private readonly requestIdGenerator: IRequestIdGenerator,
    @Inject(LOGGER_CONFIG_TOKEN) private readonly config: LoggerConfiguration,
    private readonly reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (this.shouldExcludeUrl(request.url)) {
      return next.handle();
    }

    const isExcluded = this.reflector.getAllAndOverride<boolean>(
      LOGGER_EXCLUDE_METADATA,
      [context.getHandler(), context.getClass()]
    );

    if (isExcluded) {
      return next.handle();
    }

    const requestId = this.requestIdGenerator.generate();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        if (this.config.format === "pino") {
          const entry = this.createHttpLogEntry(
            request,
            response,
            requestId,
            startTime,
            30,
            "request completed"
          );
          this.logger.logHttpRequest(entry);
        } else {
          const entry = this.createLogEntry(
            request,
            response,
            requestId,
            startTime
          );
          this.logger.log(entry);
        }
      }),
      catchError((error) => {
        if (this.config.format === "pino") {
          const entry = this.createHttpLogEntry(
            request,
            response,
            requestId,
            startTime,
            50,
            "request failed"
          );
          this.logger.logHttpRequest(entry);
        } else {
          const entry = this.createLogEntry(
            request,
            response,
            requestId,
            startTime
          );
          this.logger.error(entry);
        }
        throw error;
      })
    );
  }

  private createHttpLogEntry(
    request: any,
    response: any,
    requestId: string,
    startTime: number,
    level: number,
    message: string
  ): HttpRequestLogEntry {
    const responseTime = Date.now() - startTime;
    const ip = this.getClientIp(request);

    const httpRequest: HttpRequest = {
      id: requestId,
      method: request.method,
      url: request.url,
      query: request.query || {},
      params: request.params || {},
      headers: this.sanitizeHeaders(request.headers || {}),
      remoteAddress: ip,
      remotePort: request.connection?.remotePort,
      body: this.dataSanitizer.sanitize(request.body),
    };

    const httpResponse: HttpResponse = {
      statusCode: response.statusCode || 500,
      headers: this.sanitizeHeaders(response.getHeaders?.() || {}),
    };

    return {
      level,
      time: Date.now(),
      pid: this.pid,
      hostname: this.hostname,
      req: httpRequest,
      res: httpResponse,
      responseTime,
      msg: message,
    };
  }

  private createLogEntry(
    request: any,
    response: any,
    requestId: string,
    startTime: number
  ): LogOptions {
    const responseTime = Date.now() - startTime;
    const ip = this.getClientIp(request);

    return {
      message: `${request.method} ${request.url} - ${response.statusCode || 500} (${responseTime}ms)`,
      context: "HttpLogger",
      metadata: {
        requestId,
        method: request.method,
        url: request.url,
        statusCode: response.statusCode || 500,
        responseTime,
        remoteAddress: ip,
        userAgent: request.headers["user-agent"],
      },
    };
  }

  private getClientIp(request: any): string {
    return (
      request.headers["x-forwarded-for"] ||
      request.headers["x-real-ip"] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      "unknown"
    );
  }

  private sanitizeHeaders(
    headers: Record<string, any>
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === "string") {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.join(", ");
      } else {
        sanitized[key] = String(value);
      }
    }

    return this.dataSanitizer.sanitize(sanitized) as Record<string, string>;
  }

  private shouldExcludeUrl(url: string): boolean {
    return this.config.exclude.some((excludeUrl) => {
      if (excludeUrl.includes("*")) {
        const pattern = excludeUrl.replace(/\*/g, ".*");
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(url);
      }

      return url === excludeUrl;
    });
  }
}
