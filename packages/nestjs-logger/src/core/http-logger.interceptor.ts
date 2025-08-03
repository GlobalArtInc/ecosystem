import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { LoggerService } from "./logger.service";
import { IDataSanitizer, IRequestIdGenerator } from "../contracts";
import {
  HttpRequestLogEntry,
  HttpRequest,
  HttpResponse,
  LoggerConfiguration,
} from "../types";
import { LOGGER_CONFIG_TOKEN } from "../constants";
import { hostname } from "os";

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  private readonly hostname = hostname();
  private readonly pid = process.pid;

  constructor(
    private readonly logger: LoggerService,
    private readonly dataSanitizer: IDataSanitizer,
    private readonly requestIdGenerator: IRequestIdGenerator,
    @Inject(LOGGER_CONFIG_TOKEN) private readonly config: LoggerConfiguration
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Проверяем, нужно ли исключить этот URL из логирования
    if (this.shouldExcludeUrl(request.url)) {
      return next.handle();
    }

    const requestId = this.requestIdGenerator.generate();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const entry = this.createLogEntry(
          request,
          response,
          requestId,
          startTime,
          30, // INFO level
          "request completed"
        );
        this.logger.logHttpRequest(entry);
      }),
      catchError((error) => {
        const entry = this.createLogEntry(
          request,
          response,
          requestId,
          startTime,
          50, // ERROR level
          "request failed"
        );
        this.logger.logHttpRequest(entry);
        throw error;
      })
    );
  }

  private createLogEntry(
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
      // Поддержка простых паттернов с * (wildcard)
      if (excludeUrl.includes("*")) {
        const pattern = excludeUrl.replace(/\*/g, ".*");
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(url);
      }

      // Точное совпадение
      return url === excludeUrl;
    });
  }
}
