import {
  ERROR_DESCRIPTIONS,
  SwaggerDocumentation,
} from "@globalart/nestjs-swagger";
import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("hello")
  @SwaggerDocumentation({
    endpointDescription: "Example description",
    endpointSummary: "Example summary",
    error400Description: ERROR_DESCRIPTIONS.BAD_REQUEST,
    error401Description: ERROR_DESCRIPTIONS.UNAUTHORIZED,
    error403Description: ERROR_DESCRIPTIONS.FORBIDDEN,
    error404Description: ERROR_DESCRIPTIONS.NOT_FOUND,
    error429Description: ERROR_DESCRIPTIONS.RATE_LIMIT_EXCEEDED,
    error500Description: ERROR_DESCRIPTIONS.INTERNAL_SERVER_ERROR,
  })
  async hello() {
    return "Hello World";
  }
}
