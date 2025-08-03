export interface LoggerOptions {
  level?: "error" | "warn" | "log" | "debug" | "verbose";
  timestamp?: boolean;
  colors?: boolean;
  context?: string;
  format?: "json" | "text" | "pino";
  transports?: LoggerTransport[];
  pino?: PinoOptions;
}

export interface PinoOptions {
  level?: string;
  timestamp?: boolean;
  base?: boolean;
  name?: string;
  enabled?: boolean;
}

export interface LoggerTransport {
  name: string;
  level?: string;
  format?: any;
  filename?: string;
  dirname?: string;
  maxsize?: number;
  maxFiles?: number;
}

export interface LogContext {
  timestamp?: string;
  level: string;
  message: string;
  context?: string;
  trace?: string;
  metadata?: Record<string, any>;
}

export interface LoggerMetadata {
  [key: string]: any;
}

export interface RequestLogData {
  req: {
    id: number;
    method: string;
    url: string;
    query: Record<string, any>;
    params: Record<string, any>;
    headers: Record<string, any>;
    remoteAddress: string;
    remotePort?: number;
    body?: any;
  };
  res: {
    statusCode: number;
    headers: Record<string, any>;
  };
  responseTime: number;
  msg: string;
  level: number;
  time: number;
  pid: number;
  hostname: string;
}
