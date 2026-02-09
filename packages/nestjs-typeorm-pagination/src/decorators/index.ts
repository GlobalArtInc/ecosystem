import { Inject } from "@nestjs/common";
import { EntityTarget, ObjectLiteral } from "typeorm";

export const getPaginationToken = <T extends ObjectLiteral>(
  entity: EntityTarget<T>
): string => {
  if (typeof entity === "string") {
    return `PAGINATION_SERVICE_${entity}`;
  }

  if (typeof entity === "function") {
    return `PAGINATION_SERVICE_${entity.name}`;
  }

  const entityName = (entity as { options?: { name?: string } }).options?.name;
  return `PAGINATION_SERVICE_${entityName || "Entity"}`;
};

export const getCursorPaginationToken = <T extends ObjectLiteral>(
  entity: EntityTarget<T>
): string => {
  if (typeof entity === "string") {
    return `CURSOR_PAGINATION_SERVICE_${entity}`;
  }

  if (typeof entity === "function") {
    return `CURSOR_PAGINATION_SERVICE_${entity.name}`;
  }

  const entityName = (entity as { options?: { name?: string } }).options?.name;
  return `CURSOR_PAGINATION_SERVICE_${entityName || "Entity"}`;
};

export const InjectPagination = <T extends ObjectLiteral>(
  entity: EntityTarget<T>
) => Inject(getPaginationToken(entity));

export const InjectCursorPagination = <T extends ObjectLiteral>(
  entity: EntityTarget<T>
) => Inject(getCursorPaginationToken(entity));
