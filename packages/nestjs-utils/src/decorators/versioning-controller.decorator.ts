import { Controller, Scope } from '@nestjs/common';

interface VersioningControllerOptions {
  version?: string;
  path?: string;
  access?: string;
  durable?: boolean;
  host?: string;
  scope?: Scope;
}

export const VersioningController = (options: VersioningControllerOptions = {}) => {
  let path = '';

  if (options.version) {
    path += options.version + '/';
  }
  if (options.path) {
    path += options.path;
  }

  return Controller({
    version: options.access,
    path: path || undefined,
    durable: options.durable,
    host: options.host,
    scope: options.scope,
  });
};
