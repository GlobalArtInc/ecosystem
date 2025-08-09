import { Inject } from "@nestjs/common";
import { LOGGER_SERVICE_TOKEN } from "../constants";

export const InjectLogger = () => Inject(LOGGER_SERVICE_TOKEN);
