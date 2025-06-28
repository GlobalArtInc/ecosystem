import { Inject } from "@nestjs/common";

export const getPaginationToken = (entity: Function | string): string => {
  const name = typeof entity === "function" ? entity.name : entity;
  return `PAGINATION_SERVICE_${name}`;
};

export const InjectPagination = (entity: Function | string) =>
  Inject(getPaginationToken(entity));
