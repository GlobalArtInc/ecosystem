export const API_RESPONSE_DESCRIPTION =
  'If the server is available, it always responds with code 200 or 201. Error code 400 and higher will replace the ok field: it equals false and the error text in the error field. If the input data does not pass validation, the error field contains an object with invalid fields and error text';

export const ERROR_DESCRIPTIONS = {
  BAD_REQUEST: 'Invalid request data or parameters',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  CONFLICT: 'Resource already exists or conflict detected',
  UNPROCESSABLE_ENTITY: 'Validation error',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Too many requests',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
};
