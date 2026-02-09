import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ReflectionService } from "@grpc/reflection";
import { HealthImplementation } from "grpc-health-check";

export interface GrpcLoader {
  keepCase?: boolean;
  alternateCommentMode?: boolean;
  longs?: Function;
  enums?: Function;
  bytes?: Function;
  defaults?: boolean;
  arrays?: boolean;
  objects?: boolean;
  oneofs?: boolean;
  json?: boolean;
  includeDirs?: string[];
}

export interface GrpcConfig {
  url: string;
  packageName: string;
  protoPath: string;
  loader?: GrpcLoader;
}

export const getGrpcConfig = (options: GrpcConfig): MicroserviceOptions => {
  return {
    transport: Transport.GRPC,
    options: {
      url: options.url,
      package: options.packageName,
      protoPath: options.protoPath,
      loader: options.loader,
      onLoadPackageDefinition: (pkg, server) => {
        const healthImpl = new HealthImplementation({
          "": "UNKNOWN",
        });
        healthImpl.addToServer(server);
        healthImpl.setStatus("", "SERVING");

        new ReflectionService(pkg).addToServer(server);
      },
    },
  };
};
