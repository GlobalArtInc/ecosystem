export interface SwaggerDocumentationErrorStatus {
  error400Description?: string;
  error401Description?: string;
  error403Description?: string;
  error404Description?: string;
  error409Description?: string;
  error422Description?: string;
  error429Description?: string;
  error500Description?: string;
  error503Description?: string;
}

export interface SwaggerDocumentationOptions extends SwaggerDocumentationErrorStatus {
  endpointDescription?: string;
  endpointSummary?: string;
  // eslint-disable-next-line @typescript-eslint/ban-types
  responseDto?: Function;
  isArray?: boolean;
  isPaginated?: boolean;
}
