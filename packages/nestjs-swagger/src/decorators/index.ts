import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { API_RESPONSE_DESCRIPTION } from '../constants';
import { PaginatedResponseDto } from '../dtos';
import { SwaggerDocumentationOptions } from '../interfaces';

// SwaggerDocumentation is a decorator function to generate Swagger documentation for endpoints based on the provided options.
export const SwaggerDocumentation = (data: SwaggerDocumentationOptions) => {
  const decorators = [
    ApiOperation({
      description: data.endpointDescription,
      summary: data.endpointSummary,
    }),
  ];

  if (data.error400Description) {
    decorators.push(ApiBadRequestResponse({
      description: data.error400Description,
    }));
  }

  if (data.error401Description) {
    decorators.push(ApiUnauthorizedResponse({
      description: data.error401Description,
    }));
  }

  if (data.error403Description) {
    decorators.push(ApiForbiddenResponse({
      description: data.error403Description,
    }));
  }

  if (data.error404Description) {
    decorators.push(ApiNotFoundResponse({
      description: data.error404Description,
    }));
  }

  if (data.error409Description) {
    decorators.push(ApiConflictResponse({
      description: data.error409Description,
    }));
  }

  if (data.error422Description) {
    decorators.push(ApiUnprocessableEntityResponse({
      description: data.error422Description,
    }));
  }

  if (data.error429Description) {
    decorators.push(ApiTooManyRequestsResponse({
      description: data.error429Description,
    }));
  }

  if (data.error500Description) {
    decorators.push(ApiInternalServerErrorResponse({
      description: data.error500Description,
    }));
  }

  if (data.error503Description) {
    decorators.push(ApiServiceUnavailableResponse({
      description: data.error503Description,
    }));
  }

  if (data.isPaginated && data.responseDto) {
    decorators.push(
      ApiOkResponse({
        schema: {
          allOf: [
            { $ref: getSchemaPath(PaginatedResponseDto) },
            {
              properties: {
                data: {
                  type: 'array',
                  items: {
                    $ref: getSchemaPath(data.responseDto),
                  },
                },
              },
            },
          ],
        },
        description: API_RESPONSE_DESCRIPTION,
      }),
      ApiExtraModels(data.responseDto, PaginatedResponseDto)
    );
  } else if (data.responseDto) {
    decorators.push(
      ApiOkResponse({
        schema: data.isArray
          ? {
              type: 'array',
              items: { $ref: getSchemaPath(data.responseDto) },
            }
          : { $ref: getSchemaPath(data.responseDto) },
        description: API_RESPONSE_DESCRIPTION,
      }),
      ApiExtraModels(data.responseDto)
    );
  } else {
    decorators.push(
      ApiOkResponse({
        description: API_RESPONSE_DESCRIPTION,
      })
    );
  }

  return applyDecorators(...decorators);
};
