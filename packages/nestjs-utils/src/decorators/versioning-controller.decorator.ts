import { applyDecorators, Controller, Scope } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

interface VersioningControllerOptions {
  version?: string;
  path?: string;
  access?: string;
  durable?: boolean;
  host?: string;
  scope?: Scope;
  addTag?: boolean;
}

export const VersioningController = (options: VersioningControllerOptions = {}) => {
  let path = '';

  if (options.version) {
    path += options.version + '/';
  }
  if (options.path) {
    path += options.path;
  }

  const decorators = [];
  decorators.push(
    Controller({
      version: options.access,
      path: path || undefined,
      durable: options.durable,
      host: options.host,
      scope: options.scope,
    })
  );
  if (options.addTag && options.access) {
    decorators.push(
      ApiTags(options.access)
    );
  }

  return applyDecorators(...decorators);
};
