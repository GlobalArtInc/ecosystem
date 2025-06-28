import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import * as fastify from "fastify";

export const UploadedFiles = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest() as fastify.FastifyRequest;
    const allFiles: Storage.MultipartFile[] = [];
    Object.values(req.storedFiles).forEach((files) => {
      allFiles.push(...files);
    });
    return allFiles;
  }
);

export const UploadedFile = createParamDecorator(
  (fieldName: string | unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest() as fastify.FastifyRequest;

    if (typeof fieldName === "string") {
      const files = req.storedFiles[fieldName];
      return files && files.length > 0 ? files[0] : null;
    }

    return req.storedFiles;
  }
);
