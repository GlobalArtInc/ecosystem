import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  RequestMethod,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { hostname } from "os";
import { Observable } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { LOGGER_CONFIG_TOKEN, LOGGER_EXCLUDE_METADATA } from "../constants";
import type { IDataSanitizer, IRequestIdGenerator } from "../contracts/index";
import type {
  HttpRequest,
  HttpRequestLogEntry,
  HttpResponse,
  LoggerConfiguration,
  LogOptions,
} from "../types/index";
import { LoggerService } from "./logger.service";
// Опциональный импорт для GraphQL
let GqlExecutionContext: any;
try {
  GqlExecutionContext = require("@nestjs/graphql").GqlExecutionContext;
} catch {
  // GraphQL модуль не установлен
}

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
    const contextType = context.getType<string>();

    if (contextType === "graphql") {
      return this.handleGraphQLRequest(context, next);
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (!request || !request.method) {
      return next.handle();
    }

    const requestMethod = this.getRequestMethod(request.method);
    if (this.shouldExcludeRequest(requestMethod, request.url)) {
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
        const errorMessage = this.extractErrorMessage(error);
        const errorTrace = this.extractErrorTrace(error);

        if (this.config.format === "pino") {
          const entry = this.createHttpLogEntry(
            request,
            response,
            requestId,
            startTime,
            50,
            errorMessage || "request failed"
          );
          this.logger.logHttpRequest(entry);
        } else {
          const baseEntry = this.createLogEntry(
            request,
            response,
            requestId,
            startTime
          );
          this.logger.error({
            ...baseEntry,
            message: errorMessage || baseEntry.message,
            trace: errorTrace,
          });
        }
        throw error;
      })
    );
  }

  private handleGraphQLRequest(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<unknown> {
    if (!GqlExecutionContext) {
      return next.handle();
    }

    try {
      const gqlContext = GqlExecutionContext.create(context);
      const info = gqlContext.getInfo();
      const args = gqlContext.getArgs();
      const startTime = Date.now();
      const requestId = this.requestIdGenerator.generate();

      const operationType = info.operation.operation;
      const operationName = info.operation.name?.value || "Anonymous";
      const fieldName = info.fieldName;

      this.logger.log({
        message: `GraphQL ${operationType}: ${operationName}.${fieldName}`,
        context: "GraphQL",
        metadata: {
          requestId,
          operationType,
          operationName,
          fieldName,
          args: this.sanitizeGraphQLArgs(args),
        },
      });

      return next.handle().pipe(
        tap((result) => {
          const responseTime = Date.now() - startTime;
          this.logger.log({
            message: `GraphQL ${operationType} completed: ${operationName}.${fieldName} (${responseTime}ms)`,
            context: "GraphQL",
            metadata: {
              requestId,
              operationType,
              operationName,
              fieldName,
              responseTime,
              resultSize: this.getGraphQLResultSize(result),
            },
          });
        }),
        catchError((error) => {
          const responseTime = Date.now() - startTime;
          const errorMessage = this.extractErrorMessage(error);
          const errorTrace = this.extractErrorTrace(error);

          this.logger.error({
            message:
              errorMessage ||
              `GraphQL ${operationType} failed: ${operationName}.${fieldName} (${responseTime}ms)`,
            context: "GraphQL",
            metadata: {
              requestId,
              operationType,
              operationName,
              fieldName,
              responseTime,
            },
            trace: errorTrace,
          });
          throw error;
        })
      );
    } catch (gqlError) {
      return next.handle();
    }
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

  private getRequestMethod(method: string): RequestMethod {
    switch (method.toUpperCase()) {
      case "GET":
        return RequestMethod.GET;
      case "POST":
        return RequestMethod.POST;
      case "PUT":
        return RequestMethod.PUT;
      case "DELETE":
        return RequestMethod.DELETE;
      case "PATCH":
        return RequestMethod.PATCH;
      case "OPTIONS":
        return RequestMethod.OPTIONS;
      case "HEAD":
        return RequestMethod.HEAD;
      default:
        return RequestMethod.ALL;
    }
  }

  private shouldExcludeRequest(method: RequestMethod, path: string): boolean {
    return this.config.exclude.some((excludeOption) => {
      if (excludeOption.method !== method) {
        return false;
      }

      if (excludeOption.path.includes("*")) {
        const pattern = excludeOption.path.replace(/\*/g, ".*");
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(path);
      }

      return path === excludeOption.path;
    });
  }

  private sanitizeGraphQLArgs(args: any): any {
    if (!args || typeof args !== "object") {
      return args;
    }

    const sanitized = { ...args };

    if (sanitized.input && sanitized.input.password) {
      sanitized.input = { ...sanitized.input, password: "[HIDDEN]" };
    }

    return this.dataSanitizer.sanitize(sanitized);
  }

  private getGraphQLResultSize(result: any): string {
    if (Array.isArray(result)) {
      return `${result.length} items`;
    }
    if (result && typeof result === "object") {
      return "1 object";
    }
    return "primitive";
  }

  private extractErrorMessage(error: unknown): string | undefined {
    if (!error) return undefined;

    // Nest HttpException
    if (typeof (error as any).getResponse === "function") {
      const resp = (error as any).getResponse();
      if (typeof resp === "string") return resp;
      if (resp && typeof resp === "object") {
        return (
          (resp as any).message || (resp as any).error || (error as any).message
        );
      }
    }

    // GraphQL/Apollo ошибки
    if ((error as any).extensions && (error as any).extensions.exception) {
      const ex = (error as any).extensions.exception;
      return ex.message || (error as any).message;
    }

    return (error as any).message;
  }

  private extractErrorTrace(error: unknown): string | undefined {
    if (!error) return undefined;

    // Nest HttpException
    if (typeof (error as any).getResponse === "function") {
      const ex = error as any;
      return ex.stack || ex.trace || undefined;
    }

    // GraphQL/Apollo ошибки
    if ((error as any).extensions && (error as any).extensions.exception) {
      const ex = (error as any).extensions.exception;
      return ex.stacktrace
        ? Array.isArray(ex.stacktrace)
          ? ex.stacktrace.join("\n")
          : String(ex.stacktrace)
        : ex.stack || undefined;
    }

    return (error as any).stack;
  }
}
