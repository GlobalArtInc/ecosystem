import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

export const GRPC_SERVICE_DI_TOKEN = Symbol('GRPC_SERVICE');
export const InjectGrpcService = () => Inject(GRPC_SERVICE_DI_TOKEN);

@Injectable()
export class GrpcService {
	constructor(private readonly cls: ClsService) {}

	public addMetadata(key: string, value: string): void {
		const metadata = this.cls.get('GRPC_METADATA') || {};
		metadata[key] = value;
		this.cls.set('GRPC_METADATA', metadata);
	}

	public getMetadata(): Record<string, string> {
		return this.cls.get('GRPC_METADATA') || {};
	}
}

