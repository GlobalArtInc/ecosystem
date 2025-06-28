import "@fastify/cookie";

declare global {
  namespace Storage {
    interface MultipartFile {
      buffer: Buffer;
      filename: string;
      size: number;
      mimetype: string;
      fieldname: string;
    }
  }
}

declare module "fastify" {
  interface FastifyRequest {
    cookies: { [cookieName: string]: string | undefined };
    storedFiles: Record<string, Storage.MultipartFile[]>;
    body: unknown;
  }

  interface FastifyReply {
    setCookie(
      name: string,
      value: string,
      options?: import("@fastify/cookie").CookieSerializeOptions,
    ): FastifyReply;

    clearCookie(
      name: string,
      options?: import("@fastify/cookie").CookieSerializeOptions,
    ): FastifyReply;

    unsignCookie(value: string): import("@fastify/cookie").UnsignResult;
  }

  interface FastifyInstance {
    parseCookie(cookieHeader: string): { [key: string]: string };
    unsignCookie(value: string): import("@fastify/cookie").UnsignResult;
  }
}
