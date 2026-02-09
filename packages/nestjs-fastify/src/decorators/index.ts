import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import * as fastify from "fastify";
import { ApiProperty, ApiPropertyOptions } from "@nestjs/swagger";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";

const API_PARAMETERS = "swagger/apiParameters";
const IGNORED_TYPES = new Set([
  "Object", "String", "Number", "Boolean", "Array", "Promise",
  "FastifyRequest", "IncomingMessage", "FastifyReply", "ServerResponse", "LoggerService", "MultiPartFile"
]);

function getBodyType(target: any, key: string, idx: number): any {
  const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};
  const types = Reflect.getMetadata("design:paramtypes", target, key) || [];

  const bodyKey = Object.keys(routeArgs).find(k =>
    k.includes(`:${RouteParamtypes.BODY}`) || routeArgs[k].index === RouteParamtypes.BODY
  );
  if (bodyKey) return types[routeArgs[bodyKey].index];

  return types.find((t: any, i: number) => i !== idx && t && !IGNORED_TYPES.has(t.name));
}

function updateSwagger(target: any, key: string, idx: number, field: string, isArray: boolean) {
  const method = target[key];
  if (!method) return;

  const params = Reflect.getMetadata(API_PARAMETERS, method) || [];
  let bodyParam = params.find((p: any) => p.in === "body");
  const fileProp: ApiPropertyOptions = {
    type: isArray ? "array" : "string",
    format: "binary",
    ...(isArray && { items: { type: "string", format: "binary" } })
  };

  if (bodyParam?.schema) {
    bodyParam.schema.properties = { ...bodyParam.schema.properties, [field]: fileProp };
    Reflect.defineMetadata(API_PARAMETERS, params, method);
    return;
  }

  let BodyClass = bodyParam?.type || getBodyType(target, key, idx);
  if (!BodyClass?.name?.endsWith("_CombinedDto")) {
    const Parent = BodyClass || class { };
    BodyClass = class extends Parent { };
    Object.defineProperty(BodyClass, "name", { value: `${target.constructor.name}_${key}_CombinedDto` });

    const newParam = { in: "body", type: BodyClass, required: true };
    const pIdx = params.findIndex((p: any) => p.in === "body");
    if (pIdx > -1) params[pIdx] = newParam; else params.push(newParam);
    Reflect.defineMetadata(API_PARAMETERS, params, method);
  }

  ApiProperty(fileProp)(BodyClass.prototype, field);
}

const createUploader = (isArray: boolean, extract: (req: fastify.FastifyRequest, f: string) => any) =>
  (field: string = isArray ? "files" : "file") =>
    (target: any, key: string, idx: number) => {
      updateSwagger(target, key, idx, field, isArray);
      createParamDecorator((data: string, ctx: ExecutionContext) =>
        extract(ctx.switchToHttp().getRequest(), data)
      )(field)(target, key, idx);
    };

export const UploadedFiles = createUploader(true, (req) => {
  const files: any[] = [];
  if (req.storedFiles) Object.values(req.storedFiles).forEach(f => files.push(...f));
  return files;
});

export const UploadedFile = createUploader(false, (req, field) => req.storedFiles?.[field]?.[0] || null);
