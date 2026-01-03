import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ReflectionService } from "@grpc/reflection";
import { HealthImplementation } from "grpc-health-check";

interface GrpcConfig {
  url: string;
  packageName: string;
  protoPath: string;
}

export const getGrpcConfig = (options: GrpcConfig): MicroserviceOptions => {
  return {
    transport: Transport.GRPC,
    options: {
      url: options.url,
      package: options.packageName,
      protoPath: options.protoPath,
      onLoadPackageDefinition: (pkg, server) => {
        const healthImpl = new HealthImplementation({
          '': 'UNKNOWN',
        });
        healthImpl.addToServer(server);
        healthImpl.setStatus('', 'SERVING');

        new ReflectionService(pkg).addToServer(server);
      },
    }
  }
}