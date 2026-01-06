import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ContextService } from '../context/context.service';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class ContextInterceptor implements NestInterceptor {
  constructor(private readonly contextService: ContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'rpc') {
      return new Observable((subscriber) => {
        this.contextService.run(() => {
          const grpcContext = context.switchToRpc().getContext();
          
          if (grpcContext instanceof Metadata) {
            const metadataMap = grpcContext.getMap();
            const metadataDict: Record<string, any> = {};
            
            Object.keys(metadataMap).forEach((key) => {
              metadataDict[key] = metadataMap[key];
            });

            this.contextService.set('GRPC_METADATA', metadataDict);
          }

          next.handle().subscribe(subscriber);
        });
      });
    }

    return next.handle();
  }
}
