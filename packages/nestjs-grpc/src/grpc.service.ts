import { Inject, Injectable } from '@nestjs/common';
import { ContextService } from './context/context.service';

export const GRPC_SERVICE_DI_TOKEN = Symbol('GRPC_SERVICE');
export const InjectGrpcService = () => Inject(GRPC_SERVICE_DI_TOKEN);

@Injectable()
export class GrpcService {
	constructor(private readonly contextService: ContextService) {}

	public addMetadata(key: string, value: string): void {
		const metadata = this.contextService.get<Record<string, string>>('GRPC_METADATA') || {};
		metadata[key] = value;
		this.contextService.set('GRPC_METADATA', metadata);
	}

	public getMetadata(): Record<string, string> {
		return this.contextService.get<Record<string, string>>('GRPC_METADATA') || {};
	}
}

